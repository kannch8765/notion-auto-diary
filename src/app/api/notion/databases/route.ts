import { NextResponse } from "next/server";
import { getConfiguredNotionDatabases } from "@/lib/notion-env";

export async function GET() {
  const databases = getConfiguredNotionDatabases(process.env);

  if (databases.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No configured Notion databases found. Add NOTION_DATABASE_ID (and optionally NOTION_DATABASE_ID2, NOTION_DATABASE_ID3, ...) to .env.local.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    results: databases,
  });
}

