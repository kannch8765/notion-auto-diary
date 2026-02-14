import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Callout } from "../Callout";
import { cx, getNotionLikeThemeClasses } from "../theme";
import type { RuntimeDateSelection } from "../types";

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeekSunday(date: Date) {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function StepDashboard({
  isDark,
  selection,
  setSelection,
}: {
  isDark: boolean;
  selection: RuntimeDateSelection;
  setSelection: Dispatch<SetStateAction<RuntimeDateSelection>>;
}) {
  const t = getNotionLikeThemeClasses(isDark);
  const today = new Date();

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  const selectionKey = selection.mode === "single" ? selection.date : `${selection.start}|${selection.end}`;
  const previewUrl = (() => {
    const params = new URLSearchParams({ limitPerDb: "3" });
    if (selection.mode === "single") {
      params.set("targetDate", selection.date);
    } else {
      params.set("startDate", selection.start);
      params.set("endDate", selection.end);
    }
    return `/api/aggregate/input-to-ai?${params.toString()}`;
  })();

  function firstLines(text: string, count: number) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const slice = lines.slice(0, count).join("\n").trim();
    const hasMore = lines.length > count;
    return { slice, hasMore };
  }

  const loadPreview = useCallback(async (signal: AbortSignal) => {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const res = await fetch(previewUrl, { method: "GET", signal });
      const json = (await res.json()) as unknown;
      const parsed = parsePreview(json);
      if (!parsed.ok) {
        setPreviewError(parsed.error);
        setPreviewItems([]);
        return;
      }
      setPreviewItems(parsed.items);
    } catch (e: unknown) {
      if (signal.aborted) return;
      const message = e instanceof Error ? e.message : String(e);
      setPreviewError(message || "Failed to load preview");
      setPreviewItems([]);
    } finally {
      if (!signal.aborted) setPreviewLoading(false);
    }
  }, [previewUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void loadPreview(controller.signal);
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadPreview, selectionKey, selection.mode]);

  const previewByDb = useMemo(() => groupPreviewByDb(previewItems), [previewItems]);

  return (
    <div className="space-y-4">
      <Callout emoji="📅" title="Dashboard" isDark={isDark}>
        Pick a date or date range for filtering. This is runtime-only and won’t be saved to <span className={t.heading}>config.json</span>.
      </Callout>

      <div className={cx("rounded-xl border p-4", isDark ? "border-white/10" : "border-zinc-200")}>
        <div className={cx("text-sm font-semibold", t.heading)}>Quick selections</div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={t.buttonSecondary}
            onClick={() => setSelection({ mode: "single", date: toYmd(today) })}
          >
            Today
          </button>
          <button
            type="button"
            className={t.buttonSecondary}
            onClick={() =>
              setSelection({
                mode: "range",
                start: toYmd(startOfWeekMonday(today)),
                end: toYmd(endOfWeekSunday(today)),
              })
            }
          >
            This week
          </button>
          <button
            type="button"
            className={t.buttonSecondary}
            onClick={() =>
              setSelection({
                mode: "range",
                start: toYmd(startOfMonth(today)),
                end: toYmd(endOfMonth(today)),
              })
            }
          >
            This month
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cx(selection.mode === "single" ? t.buttonPrimary : t.buttonSecondary)}
            onClick={() => {
              if (selection.mode === "single") return;
              setSelection({ mode: "single", date: selection.start });
            }}
          >
            Single day
          </button>
          <button
            type="button"
            className={cx(selection.mode === "range" ? t.buttonPrimary : t.buttonSecondary)}
            onClick={() => {
              if (selection.mode === "range") return;
              setSelection({ mode: "range", start: selection.date, end: selection.date });
            }}
          >
            Range
          </button>
        </div>

        {selection.mode === "single" ? (
          <div className="mt-4">
            <div className={cx("text-sm font-medium", t.heading)}>Date</div>
            <input
              type="date"
              className={cx(t.input, "mt-2")}
              value={selection.date}
              onChange={(e) => setSelection({ mode: "single", date: e.target.value })}
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className={cx("text-sm font-medium", t.heading)}>Start</div>
              <input
                type="date"
                className={cx(t.input, "mt-2")}
                value={selection.start}
                onChange={(e) => setSelection((prev) => (prev.mode === "range" ? { ...prev, start: e.target.value } : prev))}
              />
            </div>
            <div>
              <div className={cx("text-sm font-medium", t.heading)}>End</div>
              <input
                type="date"
                className={cx(t.input, "mt-2")}
                value={selection.end}
                onChange={(e) => setSelection((prev) => (prev.mode === "range" ? { ...prev, end: e.target.value } : prev))}
              />
            </div>
          </div>
        )}

        <div className={cx("mt-4 text-xs", t.subtleText)}>
          {selection.mode === "single"
            ? `Selected: ${selection.date}`
            : `Selected: ${selection.start} → ${selection.end}`}
        </div>
      </div>

      <div className={cx("rounded-xl border p-4", isDark ? "border-white/10" : "border-zinc-200")}>
        <div className="flex items-center justify-between gap-3">
          <div className={cx("text-sm font-semibold", t.heading)}>Preview</div>
          <button
            type="button"
            className={t.buttonSecondary}
            disabled={previewLoading}
            onClick={() => {
              const controller = new AbortController();
              void loadPreview(controller.signal);
            }}
          >
            {previewLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {previewError && <div className={cx("mt-3", t.dangerBanner)}>{previewError}</div>}

        {!previewError && previewItems.length === 0 && !previewLoading && (
          <div className={cx("mt-3 text-sm", t.subtleText)}>No results for this period.</div>
        )}

        <div className="mt-3 space-y-4">
          {Array.from(previewByDb.entries()).map(([dbKey, items]) => (
            <div key={dbKey} className={cx("rounded-lg border p-3", isDark ? "border-white/10 bg-black/20" : "border-zinc-200 bg-white")}> 
              <div className={cx("text-sm font-medium", t.heading)}>{dbKey}</div>
              <div className={cx("mt-1 text-xs", t.subtleText)}>{items.length} item(s) shown</div>

              <div className="mt-3 space-y-3">
                {items.map((it) => {
                  const contentPreview = it.page_content ? firstLines(it.page_content, 3) : null;
                  return (
                    <div key={it.page_id} className={cx("rounded-lg border p-3", isDark ? "border-white/10" : "border-zinc-200")}>
                      <div className={cx("text-sm font-medium", t.heading)}>
                        {it.title || "Untitled"}
                      </div>
                      {it.page_url && (
                        <div className={cx("mt-1 text-xs", t.subtleText)}>
                          <a className={cx("underline", isDark ? "text-zinc-200" : "text-zinc-800")} href={it.page_url} target="_blank" rel="noreferrer">
                            Open in Notion
                          </a>
                        </div>
                      )}

                      {Object.keys(it.selected_properties).length > 0 && (
                        <div className="mt-3 space-y-1">
                          {Object.entries(it.selected_properties).map(([k, v]) => (
                            <div key={k} className={cx("text-sm", t.subtleText)}>
                              <span className={t.heading}>{k}:</span> {v}
                            </div>
                          ))}
                        </div>
                      )}

                      {contentPreview && contentPreview.slice && (
                        <div className={cx("mt-3 rounded-lg border p-3 text-sm whitespace-pre-wrap", isDark ? "border-white/10 bg-black/30 text-zinc-100" : "border-zinc-200 bg-zinc-50 text-zinc-900")}>
                          {contentPreview.slice}
                          {contentPreview.hasMore && <div className={cx("mt-2 text-xs", t.subtleText)}>…</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type PreviewItem = {
  database_id: string;
  nickname: string;
  page_id: string;
  page_url: string;
  title: string;
  selected_properties: Record<string, string>;
  page_content: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parsePreview(json: unknown): { ok: true; items: PreviewItem[] } | { ok: false; error: string } {
  if (!isObject(json) || json.success !== true) {
    const error = isObject(json) ? getString(json.error) : "";
    return { ok: false, error: error || "Failed to load preview" };
  }
  if (!isObject(json.payload) || !Array.isArray(json.payload.items)) {
    return { ok: false, error: "Invalid response payload" };
  }

  const items: PreviewItem[] = [];
  for (const raw of json.payload.items) {
    if (!isObject(raw)) continue;
    const selected = raw.selected_properties;
    const selected_properties: Record<string, string> = {};
    if (isObject(selected)) {
      for (const [k, v] of Object.entries(selected)) {
        const sv = getString(v);
        if (k && sv) selected_properties[k] = sv;
      }
    }

    items.push({
      database_id: getString(raw.database_id),
      nickname: getString(raw.nickname),
      page_id: getString(raw.page_id),
      page_url: getString(raw.page_url),
      title: getString(raw.title),
      selected_properties,
      page_content: getString(raw.page_content),
    });
  }

  return { ok: true, items };
}

function groupPreviewByDb(items: PreviewItem[]) {
  const map = new Map<string, PreviewItem[]>();
  for (const it of items) {
    const key = it.nickname || it.database_id || "(unknown database)";
    const list = map.get(key) ?? [];
    list.push(it);
    map.set(key, list);
  }
  return map;
}

