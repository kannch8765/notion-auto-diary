import type { RichTextItemResponse } from "@notionhq/client";

export function richTextToPlainText(richText: Array<RichTextItemResponse> | undefined) {
  if (!richText || richText.length === 0) return "";
  return richText.map((t) => t.plain_text).join("");
}

