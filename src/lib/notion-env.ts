export type ConfiguredNotionDatabase = {
  envKey: string;
  databaseId: string;
};

const DATABASE_ID_KEY_REGEX = /^NOTION_DATABASE_ID(\d+)?$/;

export function getConfiguredNotionDatabases(env: NodeJS.ProcessEnv): ConfiguredNotionDatabase[] {
  const databases: ConfiguredNotionDatabase[] = [];

  for (const [key, value] of Object.entries(env)) {
    if (!DATABASE_ID_KEY_REGEX.test(key)) continue;
    const databaseId = (value ?? "").trim();
    if (!databaseId) continue;

    databases.push({
      envKey: key,
      databaseId,
    });
  }

  databases.sort((a, b) => a.envKey.localeCompare(b.envKey, undefined, { numeric: true }));
  return databases;
}

