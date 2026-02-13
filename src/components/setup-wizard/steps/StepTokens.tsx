import type { AppConfig } from "@/lib/config-types";
import { Callout } from "../Callout";
import { cx, getNotionLikeThemeClasses } from "../theme";

export function StepTokens({
  config,
  setConfig,
  isDark,
}: {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  isDark: boolean;
}) {
  const t = getNotionLikeThemeClasses(isDark);
  return (
    <div className="space-y-4">
      <Callout emoji="🔒" title="Local-only" isDark={isDark}>
        Tokens are stored in your local <span className={isDark ? "text-zinc-200" : "text-zinc-900"}>config.json</span>.
      </Callout>

      <div>
        <div className={cx("text-sm font-medium", t.heading)}>Notion Token</div>
        <input
          className={cx(t.input, "mt-2")}
          value={config.notion_token}
          onChange={(e) => setConfig((p) => ({ ...p, notion_token: e.target.value }))}
          placeholder="secret_..."
        />
      </div>

      <div>
        <div className={cx("text-sm font-medium", t.heading)}>Gemini API Key (placeholder)</div>
        <input
          className={cx(t.input, "mt-2")}
          value={config.gemini_api_key}
          onChange={(e) => setConfig((p) => ({ ...p, gemini_api_key: e.target.value }))}
          placeholder="AIza..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className={cx("text-sm font-medium", t.heading)}>Output DB (Daily) (placeholder)</div>
          <input
            className={cx(t.input, "mt-2")}
            value={config.output_database_ids.daily}
            onChange={(e) =>
              setConfig((p) => ({
                ...p,
                output_database_ids: { ...p.output_database_ids, daily: e.target.value },
              }))
            }
            placeholder="Not implemented"
          />
        </div>
        <div>
          <div className={cx("text-sm font-medium", t.heading)}>Output DB (Weekly) (placeholder)</div>
          <input
            className={cx(t.input, "mt-2")}
            value={config.output_database_ids.weekly}
            onChange={(e) =>
              setConfig((p) => ({
                ...p,
                output_database_ids: { ...p.output_database_ids, weekly: e.target.value },
              }))
            }
            placeholder="Not implemented"
          />
        </div>
      </div>
    </div>
  );
}

