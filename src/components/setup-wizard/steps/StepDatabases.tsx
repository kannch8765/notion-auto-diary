import type { AppConfig } from "@/lib/config-types";
import { Callout } from "../Callout";
import { cx, getNotionLikeThemeClasses } from "../theme";

export function StepDatabases({
  config,
  setConfig,
  isDark,
}: {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  isDark: boolean;
}) {
  const t = getNotionLikeThemeClasses(isDark);

  function addDatabase() {
    setConfig((prev) => ({
      ...prev,
      source_databases: [
        ...prev.source_databases,
        { database_id: "", nickname: "", selected_properties: [], enabled: true },
      ],
    }));
  }

  function removeDatabase(index: number) {
    setConfig((prev) => ({
      ...prev,
      source_databases: prev.source_databases.filter((_, i) => i !== index),
    }));
  }

  function upsert(index: number, update: (db: AppConfig["source_databases"][number]) => AppConfig["source_databases"][number]) {
    setConfig((prev) => {
      const next = [...prev.source_databases];
      next[index] = update(next[index]);
      return { ...prev, source_databases: next };
    });
  }

  return (
    <div className="space-y-4">
      <Callout emoji="🧱" title="Multiple sources" isDark={isDark}>
        Add one or more source database IDs. You can disable a database without removing it.
      </Callout>

      <div className="space-y-3">
        {config.source_databases.length === 0 && (
          <div className={cx("rounded-xl border p-4 text-sm", isDark ? "border-white/10 text-zinc-300" : "border-zinc-200 text-zinc-600")}>
            No databases added yet.
          </div>
        )}

        {config.source_databases.map((db, idx) => (
          <div key={`${db.database_id}-${idx}`} className={cx("rounded-xl border p-4", isDark ? "border-white/10" : "border-zinc-200")}>
            <div className="flex items-center justify-between gap-3">
              <div className={cx("text-sm font-semibold", t.heading)}>Database {idx + 1}</div>
              <button type="button" className={t.buttonGhost} onClick={() => removeDatabase(idx)}>
                🗑️ Remove
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className={cx("text-sm font-medium", t.heading)}>Database ID</div>
                <input
                  className={cx(t.input, "mt-2")}
                  value={db.database_id}
                  onChange={(e) => upsert(idx, (d) => ({ ...d, database_id: e.target.value }))}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div>
                <div className={cx("text-sm font-medium", t.heading)}>Nickname</div>
                <input
                  className={cx(t.input, "mt-2")}
                  value={db.nickname}
                  onChange={(e) => upsert(idx, (d) => ({ ...d, nickname: e.target.value }))}
                  placeholder="job hunting"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={db.enabled}
                onChange={(e) => upsert(idx, (d) => ({ ...d, enabled: e.target.checked }))}
                className={cx(
                  "h-4 w-4 rounded border",
                  isDark ? "border-white/20 bg-black/30" : "border-zinc-300 bg-white",
                )}
              />
              <div className={cx("text-sm", t.subtleText)}>Enabled</div>
            </div>

            <div className={cx("mt-3 text-xs", t.subtleText)}>Properties are selected in the next step.</div>
          </div>
        ))}
      </div>

      <button type="button" className={t.buttonSecondary} onClick={addDatabase}>
        ➕ Add database
      </button>
    </div>
  );
}

