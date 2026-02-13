import { NextResponse, type NextRequest } from "next/server";
import { isFullDataSource } from "@notionhq/client";
import { createNotionClient } from "@/lib/notion";
import { richTextToPlainText } from "@/lib/notion-text";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ dataSourceId: string }> },
) {
  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing NOTION_TOKEN" },
        { status: 500 },
      );
    }

    const { dataSourceId } = await context.params;
    if (!dataSourceId) {
      return NextResponse.json(
        { success: false, error: "Missing dataSourceId" },
        { status: 400 },
      );
    }

    const notion = createNotionClient(token);
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: dataSourceId,
    });

    if (!isFullDataSource(dataSource)) {
      return NextResponse.json(
        { success: false, error: "Notion returned a partial data source" },
        { status: 502 },
      );
    }

    const properties = Object.entries(dataSource.properties).map(([key, prop]) => ({
      key,
      id: prop.id,
      name: prop.name,
      type: prop.type,
    }));

    return NextResponse.json({
      success: true,
      dataSource: {
        id: dataSource.id,
        title: richTextToPlainText(dataSource.title),
        databaseParent: dataSource.database_parent,
      },
      properties,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message || "Unknown error" },
      { status: 500 },
    );
  }
}

