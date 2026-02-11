import { NextResponse } from "next/server";
import { createNotionClient } from "@/lib/notion";

export async function GET() {
  try {
    const token = process.env.NOTION_TOKEN!;
    const databaseId = process.env.NOTION_DATABASE_ID!;

    const notion = createNotionClient(token);

    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      page_size: 5,
    });

    return NextResponse.json({
      success: true,
      results: response.results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
