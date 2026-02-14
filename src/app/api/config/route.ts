import { NextResponse, type NextRequest } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "@/lib/config-types";

export const runtime = "nodejs";

function getConfigPath() {
  return path.join(process.cwd(), "config.json");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validateAppConfig(value: unknown): value is AppConfig {
  if (!isObject(value)) return false;
  if (typeof value.notion_token !== "string") return false;
  if (typeof value.gemini_api_key !== "string") return false;
  if (!isObject(value.output_database_ids)) return false;
  if (typeof value.output_database_ids.daily !== "string") return false;
  if (typeof value.output_database_ids.weekly !== "string") return false;
  if (!Array.isArray(value.source_databases)) return false;
  for (const db of value.source_databases) {
    if (!isObject(db)) return false;
    if (typeof db.database_id !== "string") return false;
    if (typeof db.nickname !== "string") return false;
    if (typeof db.enabled !== "boolean") return false;
    if (db.include_page_content !== undefined && typeof db.include_page_content !== "boolean") return false;
    if (db.anchor_date_property !== undefined && typeof db.anchor_date_property !== "string") return false;
    if (!Array.isArray(db.selected_properties)) return false;
    for (const p of db.selected_properties) {
      if (!isObject(p)) return false;
      if (typeof p.name !== "string") return false;
      if (typeof p.type !== "string") return false;
    }
  }
  return true;
}

export async function GET() {
  const configPath = getConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!validateAppConfig(parsed)) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Invalid config.json structure" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, config: parsed });
  } catch (error: unknown) {
    const code = isObject(error) ? (error.code as unknown) : undefined;
    if (code === "ENOENT") {
      return NextResponse.json(
        { success: false, code: "CONFIG_NOT_FOUND", error: "config.json not found" },
        { status: 404 },
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, code: "IO_ERROR", error: message || "Failed to read config.json" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const configPath = getConfigPath();

  try {
    const body = (await req.json()) as unknown;

    if (!validateAppConfig(body)) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Invalid AppConfig payload" },
        { status: 400 },
      );
    }

    const json = JSON.stringify(body, null, 2) + "\n";
    await writeFile(configPath, json, "utf8");

    return NextResponse.json({ success: true, config: body }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, code: "IO_ERROR", error: message || "Failed to write config.json" },
      { status: 500 },
    );
  }
}
