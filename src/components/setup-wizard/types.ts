import type { NotionPropertyType } from "@/lib/config-types";

export type WizardStep = 0 | 1 | 2 | 3;

export type NotionDataSourceRef = {
  id: string;
  name: string;
};

export type NotionPropertyRef = {
  key: string;
  name: string;
  type: NotionPropertyType;
};

export type DbPropertyState = {
  dataSources: NotionDataSourceRef[];
  selectedDataSourceId: string;
  properties: NotionPropertyRef[];
  loading: boolean;
  error: string;
};

