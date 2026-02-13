import { NextResponse } from "next/server";
import { createNotionClient } from "@/lib/notion";
import { getConfiguredNotionDatabases } from "@/lib/notion-env";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-notion-token") || process.env.NOTION_TOKEN;
    const url = new URL(req.url);
    const requestedDatabaseId = (url.searchParams.get("databaseId") ?? "").trim();

    const configured = getConfiguredNotionDatabases(process.env);
    const defaultDatabaseId = configured[0]?.databaseId ?? "";
    const databaseId = requestedDatabaseId || defaultDatabaseId;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing NOTION_TOKEN" },
        { status: 500 },
      );
    }

    if (!databaseId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No databaseId provided and no NOTION_DATABASE_ID* env vars found. Add NOTION_DATABASE_ID (and optionally NOTION_DATABASE_ID2, ...) to .env.local.",
        },
        { status: 500 },
      );
    }

    const notion = createNotionClient(token);
    const db = await notion.databases.retrieve({ database_id: databaseId });

    const dataSources = ("data_sources" in db && Array.isArray(db.data_sources) ? db.data_sources : []).map(
      (ds) => ({
        id: ds.id,
        name: ds.name,
      }),
    );

    return NextResponse.json({
      success: true,
      databaseId,
      results: dataSources,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message || "Unknown error" },
      { status: 500 },
    );
  }
}

