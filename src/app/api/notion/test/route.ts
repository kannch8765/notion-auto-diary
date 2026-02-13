import { NextResponse } from "next/server";
import { createNotionClient } from "@/lib/notion";

export async function GET() {
  try {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing NOTION_TOKEN" },
        { status: 500 },
      );
    }

    if (!databaseId) {
      return NextResponse.json(
        { success: false, error: "Missing NOTION_DATABASE_ID" },
        { status: 500 },
      );
    }

    const notion = createNotionClient(token);

    const db = await notion.databases.retrieve({ database_id: databaseId });
    const results = "data_sources" in db && Array.isArray(db.data_sources) ? db.data_sources : [];

    return NextResponse.json({ success: true, results });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: message || "Unknown error",
    });
  }
}
