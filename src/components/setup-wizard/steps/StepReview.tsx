import type { AppConfig } from "@/lib/config-types";
import { Callout } from "../Callout";
import { cx, getNotionLikeThemeClasses } from "../theme";

export function StepReview({
  config,
  isDark,
  saving,
  saveSuccess,
  onSave,
}: {
  config: AppConfig;
  isDark: boolean;
  saving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
}) {
  const t = getNotionLikeThemeClasses(isDark);
  return (
    <div className="space-y-4">
      <Callout emoji="✅" title="Ready to save" isDark={isDark}>
        This will write a local <span className={isDark ? "text-zinc-200" : "text-zinc-900"}>config.json</span> at the project root.
      </Callout>

      <div className={cx("rounded-xl border p-4", isDark ? "border-white/10" : "border-zinc-200")}>
        <div className={cx("text-sm font-semibold", t.heading)}>Summary</div>
        <div className={cx("mt-2 text-sm", t.subtleText)}>
          {config.source_databases.length} source database(s). {config.source_databases.filter((d) => d.enabled).length} enabled.
        </div>

        <div className="mt-4 space-y-3">
          {config.source_databases.map((db, idx) => (
            <div key={`${db.database_id}-${idx}`} className={cx("rounded-lg border p-3", isDark ? "border-white/10" : "border-zinc-200")}>
              <div className={cx("text-sm font-medium", t.heading)}>
                {db.nickname || `Database ${idx + 1}`} {db.enabled ? "🟢" : "⚪"}
              </div>
              <div className={cx("mt-1 text-xs", t.subtleText)}>{db.database_id || "(missing)"}</div>
              <div className={cx("mt-2 text-xs", t.subtleText)}>
                Selected: {db.selected_properties.map((p) => p.name).join(", ") || "(none)"}
              </div>
              <div className={cx("mt-1 text-xs", t.subtleText)}>
                Filter by: {db.anchor_date_property || "(none)"}
              </div>
              <div className={cx("mt-1 text-xs", t.subtleText)}>
                Include Page Content: {db.include_page_content ? "Yes" : "No"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={cx("rounded-xl border p-4", isDark ? "border-white/10" : "border-zinc-200")}>
        <div className={cx("text-sm font-semibold", t.heading)}>Preview</div>
        <pre
          className={cx(
            "mt-3 max-h-[260px] overflow-auto rounded-lg border p-3 text-xs",
            isDark ? "border-white/10 bg-black/30 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900",
          )}
        >
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className={t.buttonPrimary} disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save to config.json"}
        </button>
        {saveSuccess && <div className={cx("text-sm", isDark ? "text-emerald-200" : "text-emerald-700")}>Saved!</div>}
      </div>
    </div>
  );
}
