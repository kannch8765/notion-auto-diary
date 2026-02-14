import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createNotionClient } from "@/lib/notion";
import { getPageBlocksPlainText } from "@/lib/notion-block-text";
import { richTextToPlainText } from "@/lib/notion-text";
import interval from "@/lib/date-interval";
import type { AppConfig } from "@/lib/config-types";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import type {
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRichText(value: unknown): RichTextItemResponse[] | undefined {
  return Array.isArray(value) ? (value as RichTextItemResponse[]) : undefined;
}

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

type RuntimeDateSelection =
  | { mode: "single"; date: string }
  | { mode: "range"; start: string; end: string };

type InputToAiPayload = {
  generated_at: string;
  runtime_date_selection: RuntimeDateSelection | null;
  items: Array<Record<string, unknown>>;
};

function parseRuntimeDateSelection(value: unknown): RuntimeDateSelection | null {
  if (!isObject(value)) return null;
  const mode = getString(value.mode);
  if (mode === "single") {
    const date = getString(value.date);
    if (!isYmd(date)) return null;
    return { mode: "single", date };
  }
  if (mode === "range") {
    const start = getString(value.start);
    const end = getString(value.end);
    if (!isYmd(start) || !isYmd(end)) return null;
    return { mode: "range", start, end };
  }
  return null;
}

function buildAnchorFilter(
  anchorName: string,
  anchorType: "date" | "created_time" | "last_edited_time",
  selection: RuntimeDateSelection,
): QueryDataSourceParameters["filter"] {
  if (selection.mode === "single") {
    const date = selection.date;
    if (anchorType === "date") return { property: anchorName, date: { equals: date } };
    if (anchorType === "created_time") return { property: anchorName, created_time: { equals: date } };
    return { property: anchorName, last_edited_time: { equals: date } };
  }

  const start = selection.start;
  const end = selection.end;

  if (anchorType === "date") {
    return {
      and: [
        { property: anchorName, date: { on_or_after: start } },
        { property: anchorName, date: { on_or_before: end } },
      ],
    };
  }
  if (anchorType === "created_time") {
    return {
      and: [
        { property: anchorName, created_time: { on_or_after: start } },
        { property: anchorName, created_time: { on_or_before: end } },
      ],
    };
  }
  return {
    and: [
      { property: anchorName, last_edited_time: { on_or_after: start } },
      { property: anchorName, last_edited_time: { on_or_before: end } },
    ],
  };
}

function buildDateSupersetFilterForOverlap(
  anchorName: string,
  selection: RuntimeDateSelection,
): QueryDataSourceParameters["filter"] | undefined {
  const selectedInterval = interval.selectionToYmdInterval(selection) as
    | { start: string; end: string }
    | null;
  if (!selectedInterval) return undefined;
  return { property: anchorName, date: { on_or_before: selectedInterval.end } };
}

function pageOverlapsSelectionByDateProperty(
  page: Record<string, unknown>,
  anchorName: string,
  selection: RuntimeDateSelection,
): boolean {
  const selectedInterval = interval.selectionToYmdInterval(selection) as
    | { start: string; end: string }
    | null;
  if (!selectedInterval) return false;
  const props = isObject(page.properties) ? (page.properties as Record<string, unknown>) : {};
  const prop = props[anchorName];
  const itemInterval = interval.notionDatePropertyToYmdInterval(prop) as
    | { start: string; end: string }
    | null;
  if (!itemInterval) return false;
  return Boolean(interval.intervalsOverlapYmd(itemInterval, selectedInterval));
}

type AnchorTypeName = "date" | "created_time" | "last_edited_time";

function isAnchorTypeName(type: string): type is AnchorTypeName {
  return type === "date" || type === "created_time" || type === "last_edited_time";
}

function pickAnchorForDataSource(args: {
  dataSource: unknown;
  preferredName: string;
  selectedProperties: Array<{ name: string; type: string }>;
}): { name: string; type: AnchorTypeName } | null {
  const { dataSource, preferredName, selectedProperties } = args;
  if (!isObject(dataSource)) return null;
  const rawProps = dataSource.properties;
  if (!isObject(rawProps)) return null;

  const anchorCandidates: Array<{ name: string; type: AnchorTypeName }> = [];
  for (const raw of Object.values(rawProps)) {
    if (!isObject(raw)) continue;
    const name = getString(raw.name);
    const type = getString(raw.type);
    if (!name || !type) continue;
    if (!isAnchorTypeName(type)) continue;
    anchorCandidates.push({ name, type });
  }

  const trimmedPreferred = preferredName.trim();
  if (trimmedPreferred) {
    const exact = anchorCandidates.find((p) => p.name === trimmedPreferred);
    if (exact) return exact;
    const lower = trimmedPreferred.toLowerCase();
    const ci = anchorCandidates.find((p) => p.name.toLowerCase() === lower);
    if (ci) return ci;
    if (anchorCandidates.length === 1) return anchorCandidates[0] ?? null;
    return null;
  }

  const selectedAnchorProps = selectedProperties.filter((p) => isAnchorTypeName(p.type));
  if (selectedAnchorProps.length === 1) {
    const name = selectedAnchorProps[0]!.name;
    const exact = anchorCandidates.find((p) => p.name === name);
    if (exact) return exact;
    const lower = name.toLowerCase();
    const ci = anchorCandidates.find((p) => p.name.toLowerCase() === lower);
    if (ci) return ci;
  }

  if (anchorCandidates.length === 1) return anchorCandidates[0] ?? null;
  return null;
}

async function readLocalConfig(): Promise<AppConfig> {
  const configPath = path.join(process.cwd(), "config.json");
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw) as AppConfig;
}

function parseRuntimeSelectionFromQuery(url: URL): RuntimeDateSelection | null {
  const targetDate = (url.searchParams.get("targetDate") ?? "").trim();
  if (targetDate && isYmd(targetDate)) {
    return { mode: "single", date: targetDate };
  }
  const start = (url.searchParams.get("startDate") ?? "").trim();
  const end = (url.searchParams.get("endDate") ?? "").trim();
  if (start && end && isYmd(start) && isYmd(end)) {
    return { mode: "range", start, end };
  }
  return null;
}

function getLimitPerDb(url: URL, fallback = 50) {
  return Math.max(1, Number(url.searchParams.get("limitPerDb") ?? String(fallback)) || fallback);
}

function getPropertyText(prop: unknown): string {
  if (!isObject(prop)) return "";
  const type = getString(prop.type);
  if (!type) return "";

  if (type === "title") return richTextToPlainText(asRichText((prop as { title?: unknown }).title));
  if (type === "rich_text") return richTextToPlainText(asRichText((prop as { rich_text?: unknown }).rich_text));
  if (type === "url") return getString((prop as { url?: unknown }).url);
  if (type === "email") return getString((prop as { email?: unknown }).email);
  if (type === "phone_number") return getString((prop as { phone_number?: unknown }).phone_number);
  if (type === "number") {
    const v = (prop as { number?: unknown }).number;
    return typeof v === "number" ? String(v) : "";
  }
  if (type === "checkbox") {
    const v = (prop as { checkbox?: unknown }).checkbox;
    return typeof v === "boolean" ? (v ? "true" : "false") : "";
  }
  if (type === "select") {
    const sel = (prop as { select?: unknown }).select;
    return isObject(sel) ? getString(sel.name) : "";
  }
  if (type === "status") {
    const st = (prop as { status?: unknown }).status;
    return isObject(st) ? getString(st.name) : "";
  }
  if (type === "multi_select") {
    const ms = (prop as { multi_select?: unknown }).multi_select;
    if (!Array.isArray(ms)) return "";
    return ms
      .map((x) => (isObject(x) ? getString(x.name) : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (type === "date") {
    const d = (prop as { date?: unknown }).date;
    if (!isObject(d)) return "";
    const start = getString(d.start);
    const end = getString(d.end);
    return end ? `${start} → ${end}` : start;
  }
  if (type === "people") {
    const ppl = (prop as { people?: unknown }).people;
    if (!Array.isArray(ppl)) return "";
    return ppl
      .map((p) => {
        if (!isObject(p)) return "";
        return getString(p.name) || getString(p.id) || getString(p.email);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (type === "files") {
    const files = (prop as { files?: unknown }).files;
    if (!Array.isArray(files)) return "";
    return files
      .map((f) => (isObject(f) ? getString(f.name) : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (type === "formula") {
    const formula = (prop as { formula?: unknown }).formula;
    if (!isObject(formula)) return "";
    const ft = getString(formula.type);
    const v = formula[ft];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    return "";
  }

  return "";
}

async function queryPages(
  notion: ReturnType<typeof createNotionClient>,
  dbConfig: AppConfig["source_databases"][number],
  limit: number,
  runtimeSelection: RuntimeDateSelection | null,
) {
  const pages: Array<Record<string, unknown>> = [];
  const databaseId = dbConfig.database_id;
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSources = "data_sources" in db && Array.isArray(db.data_sources) ? db.data_sources : [];

  const anchorName = (dbConfig.anchor_date_property ?? "").trim();
  const effectiveLimit = limit;

  for (const ds of dataSources) {
    if (pages.length >= effectiveLimit) break;
    let cursor: string | undefined;

    let filter: QueryDataSourceParameters["filter"] | undefined;
    let sorts: QueryDataSourceParameters["sorts"] | undefined;
    let postFilter: ((page: Record<string, unknown>) => boolean) | undefined;

    if (runtimeSelection) {
      const dataSource = await notion.dataSources.retrieve({ data_source_id: ds.id });
      const resolvedAnchor = pickAnchorForDataSource({
        dataSource,
        preferredName: anchorName,
        selectedProperties: dbConfig.selected_properties,
      });

      if (resolvedAnchor) {
        if (resolvedAnchor.type === "date") {
          filter = buildDateSupersetFilterForOverlap(resolvedAnchor.name, runtimeSelection);
          sorts = [{ property: resolvedAnchor.name, direction: "descending" }];
          postFilter = (page) => pageOverlapsSelectionByDateProperty(page, resolvedAnchor.name, runtimeSelection);
        } else {
          filter = buildAnchorFilter(resolvedAnchor.name, resolvedAnchor.type, runtimeSelection);
        }
      } else {
        continue;
      }
    }

    for (;;) {
      const res = await notion.dataSources.query({
        data_source_id: ds.id,
        start_cursor: cursor,
        page_size: Math.min(100, effectiveLimit - pages.length),
        ...(filter ? { filter } : {}),
        ...(sorts
          ? { sorts }
          : runtimeSelection
            ? {}
            : { sorts: [{ timestamp: "last_edited_time", direction: "descending" }] }),
      });

      for (const r of res.results) {
        if (!isObject(r)) continue;
        if (postFilter && !postFilter(r)) continue;
        pages.push(r);
        if (pages.length >= effectiveLimit) break;
      }

      if (pages.length >= effectiveLimit) break;
      if (!res.has_more || !res.next_cursor) break;
      cursor = res.next_cursor;
    }
  }

  return pages;
}

async function buildPayload(args: {
  req: NextRequest;
  limitPerDb: number;
  runtimeSelection: RuntimeDateSelection | null;
}): Promise<InputToAiPayload> {
  const config = await readLocalConfig();
  const token = args.req.headers.get("x-notion-token") || config.notion_token || process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("Missing notion token");
  }

  const notion = createNotionClient(token);
  const enabled = (config.source_databases ?? []).filter((d) => d.enabled);

  const items: Array<Record<string, unknown>> = [];

  for (const db of enabled) {
    const dbId = db.database_id?.trim();
    if (!dbId) continue;

    const pages = await queryPages(notion, db, args.limitPerDb, args.runtimeSelection);

    for (const page of pages) {
      const pageId = getString(page.id);
      const pageUrl = getString(page.url);
      const props = isObject(page.properties) ? (page.properties as Record<string, unknown>) : {};

      let pageTitle = "";
      for (const v of Object.values(props)) {
        if (!isObject(v)) continue;
        if (getString(v.type) === "title") {
          pageTitle = getPropertyText(v);
          break;
        }
      }

      const selectedValues: Record<string, string> = {};
      for (const sel of db.selected_properties) {
        const match = props[sel.name];
        const text = getPropertyText(match);
        if (text) selectedValues[sel.name] = text;
      }

      const content = db.include_page_content && pageId ? await getPageBlocksPlainText(notion, pageId) : "";

      const inputParts = [
        db.nickname ? `Database: ${db.nickname}` : "",
        pageTitle ? `Title: ${pageTitle}` : "",
        ...Object.entries(selectedValues).map(([k, v]) => `${k}: ${v}`),
        content ? `\nPage Content:\n${content}` : "",
      ];

      items.push({
        database_id: dbId,
        nickname: db.nickname,
        page_id: pageId,
        page_url: pageUrl,
        title: pageTitle,
        selected_properties: selectedValues,
        include_page_content: db.include_page_content,
        anchor_date_property: db.anchor_date_property,
        page_content: content,
        input_text: buildInputText(inputParts),
      });
    }
  }

  return {
    generated_at: new Date().toISOString(),
    runtime_date_selection: args.runtimeSelection,
    items,
  };
}

function buildInputText(parts: string[]) {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitPerDb = getLimitPerDb(url, 50);
    const runtimeSelection = parseRuntimeSelectionFromQuery(url);
    const payload = await buildPayload({ req, limitPerDb, runtimeSelection });
    return NextResponse.json({ success: true, payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitPerDb = getLimitPerDb(url, 50);

    const body = (await req.json().catch(() => null)) as unknown;
    const runtimeSelection = isObject(body) ? parseRuntimeDateSelection(body.runtime_date_selection) : null;

    const payload = await buildPayload({ req, limitPerDb, runtimeSelection });
    return NextResponse.json({ success: true, payload });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message || "Unknown error" }, { status: 500 });
  }
}

