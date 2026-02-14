import type { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { richTextToPlainText } from "@/lib/notion-text";

function isFullBlock(
  block: BlockObjectResponse | PartialBlockObjectResponse,
): block is BlockObjectResponse {
  return "type" in block;
}

function asRichText(value: unknown): RichTextItemResponse[] | null {
  if (!Array.isArray(value)) return null;
  return value as RichTextItemResponse[];
}

function getBlockLine(block: BlockObjectResponse): string {
  const type = block.type;
  const raw = (block as unknown as Record<string, unknown>)[type];
  if (!raw || typeof raw !== "object") {
    if (type === "child_page") {
      const child = (block as unknown as { child_page?: { title?: string } }).child_page;
      return child?.title ?? "";
    }
    if (type === "child_database") {
      const child = (block as unknown as { child_database?: { title?: string } }).child_database;
      return child?.title ?? "";
    }
    return "";
  }

  const obj = raw as Record<string, unknown>;
  const richText = asRichText(obj.rich_text);
  if (richText) return richTextToPlainText(richText);

  const title = typeof obj.title === "string" ? obj.title : "";
  if (title) return title;

  const caption = asRichText(obj.caption);
  if (caption) return richTextToPlainText(caption);

  return "";
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function listChildren(notion: Client, blockId: string) {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  for (;;) {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const b of res.results) {
      if (isFullBlock(b)) blocks.push(b);
    }

    if (!res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }

  return blocks;
}

export async function getPageBlocksPlainText(
  notion: Client,
  pageId: string,
  opts?: {
    maxDepth?: number;
    maxBlocks?: number;
  },
) {
  const maxDepth = opts?.maxDepth ?? 6;
  const maxBlocks = opts?.maxBlocks ?? 5000;
  const lines: string[] = [];
  let seen = 0;

  async function walk(blockId: string, depth: number) {
    if (depth > maxDepth) return;
    if (seen >= maxBlocks) return;

    const children = await listChildren(notion, blockId);

    for (const child of children) {
      if (seen >= maxBlocks) break;
      seen += 1;

      const line = getBlockLine(child);
      if (line) lines.push(line);

      if (child.has_children) {
        await walk(child.id, depth + 1);
      }
    }
  }

  await walk(pageId, 0);
  return normalizeText(lines.join("\n"));
}

