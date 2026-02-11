import { Client } from "@notionhq/client";

export function createNotionClient(token: string) {
  return new Client({
    auth: token,
    notionVersion: "2025-09-03",
  });
}
