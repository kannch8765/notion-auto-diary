import type { AppConfig, NotionPropertyType, SelectedPropertyConfig } from "@/lib/config-types";
import { Callout } from "../Callout";
import { cx, getNotionLikeThemeClasses } from "../theme";
import type { DbPropertyState, NotionDataSourceRef, NotionPropertyRef } from "../types";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function parseDataSources(results: unknown): NotionDataSourceRef[] {
  if (!Array.isArray(results)) return [];
  const list: NotionDataSourceRef[] = [];
  for (const item of results) {
    if (!isObject(item)) continue;
    const id = getString(item.id);
    if (!id) continue;
    const name = getString(item.name) || id;
    list.push({ id, name });
  }
  return list;
}
function parseProperties(results: unknown): NotionPropertyRef[] {
  if (!Array.isArray(results)) return [];
  const list: NotionPropertyRef[] = [];
  for (const item of results) {
    if (!isObject(item)) continue;
    const key = getString(item.key);
    const name = getString(item.name);
    const type = getString(item.type) as NotionPropertyType;
    if (!key || !name || !type) continue;
    list.push({ key, name, type });
  }
  return list;
}

export function StepProperties({
  config,
  setConfig,
  isDark,
  propertyStateByDbId,
  setPropertyStateByDbId,
}: {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  isDark: boolean;
  propertyStateByDbId: Record<string, DbPropertyState>;
  setPropertyStateByDbId: React.Dispatch<React.SetStateAction<Record<string, DbPropertyState>>>;
}) {
  const t = getNotionLikeThemeClasses(isDark);
  const notionToken = config.notion_token.trim();
  function ensureDbPropertyState(databaseId: string) {
    setPropertyStateByDbId((prev) => {
      if (prev[databaseId]) return prev;
      return {
        ...prev,
        [databaseId]: {
          dataSources: [],
          selectedDataSourceId: "",
          properties: [],
          loading: false,
          error: "",
        },
      };
    });
  }
  async function loadDataSources(databaseId: string) {
    ensureDbPropertyState(databaseId);
    setPropertyStateByDbId((prev) => ({
      ...prev,
      [databaseId]: {
        ...(prev[databaseId] ?? {
          dataSources: [],
          selectedDataSourceId: "",
          properties: [],
          loading: false,
          error: "",
        }),
        loading: true,
        error: "",
        dataSources: [],
        selectedDataSourceId: "",
        properties: [],
      },
    }));
    try {
      const res = await fetch(`/api/notion/data-sources?databaseId=${encodeURIComponent(databaseId)}`,
        notionToken ? { headers: { "x-notion-token": notionToken } } : undefined,
      );
      const data = (await res.json()) as unknown;
      if (!isObject(data) || data.success !== true) {
        const err = isObject(data) ? getString(data.error) : "";
        setPropertyStateByDbId((prev) => ({
          ...prev,
          [databaseId]: { ...prev[databaseId], loading: false, error: err || "Failed to load data sources" },
        }));
        return;
      }

      const dataSources = parseDataSources(data.results);
      const selected = dataSources[0]?.id ?? "";

      setPropertyStateByDbId((prev) => ({
        ...prev,
        [databaseId]: {
          ...prev[databaseId],
          loading: false,
          error: "",
          dataSources,
          selectedDataSourceId: selected,
          properties: [],
        },
      }));

      if (selected) void loadProperties(databaseId, selected);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setPropertyStateByDbId((prev) => ({
        ...prev,
        [databaseId]: { ...prev[databaseId], loading: false, error: message || "Failed to load data sources" },
      }));
    }
  }

  async function loadProperties(databaseId: string, dataSourceId: string) {
    setPropertyStateByDbId((prev) => ({
      ...prev,
      [databaseId]: { ...prev[databaseId], loading: true, error: "", selectedDataSourceId: dataSourceId, properties: [] },
    }));

    try {
      const res = await fetch(`/api/notion/data-sources/${encodeURIComponent(dataSourceId)}`,
        notionToken ? { headers: { "x-notion-token": notionToken } } : undefined,
      );
      const data = (await res.json()) as unknown;

      if (!isObject(data) || data.success !== true) {
        const err = isObject(data) ? getString(data.error) : "";
        setPropertyStateByDbId((prev) => ({
          ...prev,
          [databaseId]: { ...prev[databaseId], loading: false, error: err || "Failed to load properties" },
        }));
        return;
      }

      const properties = parseProperties(data.properties);
      setPropertyStateByDbId((prev) => ({
        ...prev,
        [databaseId]: { ...prev[databaseId], loading: false, error: "", properties },
      }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setPropertyStateByDbId((prev) => ({
        ...prev,
        [databaseId]: { ...prev[databaseId], loading: false, error: message || "Failed to load properties" },
      }));
    }
  }

  function toggleSelectedProperty(databaseId: string, property: SelectedPropertyConfig) {
    setConfig((prev) => ({
      ...prev,
      source_databases: prev.source_databases.map((db) => {
        if (db.database_id !== databaseId) return db;
        const exists = db.selected_properties.some((p) => p.name === property.name && p.type === property.type);
        const selected_properties = exists
          ? db.selected_properties.filter((p) => !(p.name === property.name && p.type === property.type))
          : [...db.selected_properties, property];
        return { ...db, selected_properties };
      }),
    }));
  }

  return (
    <div className="space-y-4">
      <Callout emoji="🧩" title="Pick input properties" isDark={isDark}>
        For each enabled database, pick at least one property. We fetch properties live from Notion.
      </Callout>

      {config.source_databases.length === 0 && (
        <div className={cx("rounded-xl border p-4 text-sm", isDark ? "border-white/10 text-zinc-300" : "border-zinc-200 text-zinc-600")}>
          Add databases in the previous step.
        </div>
      )}

      <div className="space-y-3">
        {config.source_databases.map((db, idx) => {
          const dbId = db.database_id.trim();
          const state = dbId ? propertyStateByDbId[dbId] : undefined;

          return (
            <div key={`${db.database_id}-${idx}`} className={cx("rounded-xl border p-4", isDark ? "border-white/10" : "border-zinc-200")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={cx("text-sm font-semibold", t.heading)}>
                    {db.nickname.trim() ? `${db.nickname.trim()} ` : ""}
                    <span className={cx("font-normal", t.subtleText)}>{dbId ? `(${dbId})` : "(missing database_id)"}</span>
                  </div>
                  <div className={cx("mt-1 text-xs", t.subtleText)}>{db.enabled ? "Enabled" : "Disabled"}</div>
                </div>
                <button
                  type="button"
                  className={t.buttonSecondary}
                  disabled={!db.enabled || !dbId}
                  onClick={() => {
                    if (!dbId) return;
                    void loadDataSources(dbId);
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {!db.enabled && <div className={cx("mt-3 text-sm", t.subtleText)}>Disabled databases are skipped.</div>}

              {db.enabled && !dbId && (
                <div className={cx("mt-3 text-sm", isDark ? "text-red-200" : "text-red-700")}>
                  Enter a database_id in Step 2.
                </div>
              )}

              {db.enabled && dbId && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cx("text-sm font-medium", t.heading)}>Data source</div>
                    <select
                      className={cx(
                        "rounded-lg border px-3 py-2 text-sm",
                        isDark ? "bg-black/30 border-white/10 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900",
                      )}
                      value={state?.selectedDataSourceId ?? ""}
                      disabled={state?.loading ?? false}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        if (!nextId) return;
                        void loadProperties(dbId, nextId);
                      }}
                    >
                      {(state?.dataSources ?? []).length === 0 && <option value="">(Load first)</option>}
                      {(state?.dataSources ?? []).map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name}
                        </option>
                      ))}
                    </select>
                    {state?.loading && <div className={cx("text-xs", t.subtleText)}>Loading…</div>}
                  </div>

                  {state?.error && <div className={t.dangerBanner}>{state.error}</div>}

                  {(state?.properties ?? []).length === 0 && !state?.loading && (
                    <div className={cx("text-sm", t.subtleText)}>Click Refresh to load data sources and properties.</div>
                  )}

                  {(state?.properties ?? []).length > 0 && (
                    <div className="mt-2">
                      <div className={cx("text-sm font-medium", t.heading)}>Properties</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {state!.properties.map((p) => {
                          const checked = db.selected_properties.some((sp) => sp.name === p.name && sp.type === p.type);
                          return (
                            <label
                              key={p.key}
                              className={cx(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                                isDark ? "border-white/10 bg-black/20" : "border-zinc-200 bg-white",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectedProperty(dbId, { name: p.name, type: p.type })}
                                className={cx(
                                  "h-4 w-4 rounded border",
                                  isDark ? "border-white/20 bg-black/30" : "border-zinc-300 bg-white",
                                )}
                              />
                              <div className="min-w-0">
                                <div className={cx("truncate", t.heading)}>{p.name}</div>
                                <div className={cx("text-xs", t.subtleText)}>{p.type}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
