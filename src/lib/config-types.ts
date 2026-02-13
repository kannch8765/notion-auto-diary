import type { DataSourceObjectResponse } from "@notionhq/client";

export type NotionPropertyType = DataSourceObjectResponse["properties"][string]["type"];

export interface SelectedPropertyConfig {
  name: string;
  type: NotionPropertyType;
}

export interface SourceDatabaseConfig {
  database_id: string;
  nickname: string;
  selected_properties: SelectedPropertyConfig[];
  enabled: boolean;
}

export interface OutputDatabaseIds {
  daily: string;
  weekly: string;
}

export interface AppConfig {
  notion_token: string;
  gemini_api_key: string;
  output_database_ids: OutputDatabaseIds;
  source_databases: SourceDatabaseConfig[];
}

