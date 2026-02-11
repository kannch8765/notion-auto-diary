import { NextResponse } from "next/server";
import { createNotionClient } from "@/lib/notion";

export async function GET() {
  try {
    const token = process.env.NOTION_TOKEN!;
    const databaseId = process.env.NOTION_DATABASE_ID!;

    const notion = createNotionClient(token);

    // retrieve datasource from database
    // Change your database retrieval line to this:
    const response = await notion.databases.retrieve({
      database_id: databaseId,
    }) as any; // The 'as any' tells TypeScript: "I know what I'm doing, ignore the missing property error"

    return NextResponse.json({
      success: true,
      // Now this won't show a red underline anymore
      results: response.data_sources || [], 
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
