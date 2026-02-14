"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { AppConfig, NotionPropertyType } from "@/lib/config-types";
import { Callout } from "./Callout";
import { StepPill } from "./StepPill";
import { cx, getNotionLikeThemeClasses } from "./theme";
import type { DbPropertyState, RuntimeDateSelection, WizardStep } from "./types";
import { StepDatabases } from "./steps/StepDatabases";
import { StepDashboard } from "./steps/StepDashboard";
import { StepProperties } from "./steps/StepProperties";
import { StepReview } from "./steps/StepReview";
import { StepTokens } from "./steps/StepTokens";

const defaultConfig: AppConfig = {
  notion_token: "",
  gemini_api_key: "",
  output_database_ids: { daily: "", weekly: "" },
  source_databases: [],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeConfigFromApi(value: unknown): AppConfig | null {
  if (!isObject(value)) return null;
  if (value.success !== true) return null;
  if (!isObject(value.config)) return null;
  const c = value.config;
  if (typeof c.notion_token !== "string") return null;
  if (typeof c.gemini_api_key !== "string") return null;
  if (!isObject(c.output_database_ids)) return null;
  const out = c.output_database_ids;
  if (typeof out.daily !== "string" || typeof out.weekly !== "string") return null;
  if (!Array.isArray(c.source_databases)) return null;

  const source_databases = c.source_databases
    .filter((d): d is Record<string, unknown> => isObject(d))
    .map((d) => ({
      database_id: typeof d.database_id === "string" ? d.database_id : "",
      nickname: typeof d.nickname === "string" ? d.nickname : "",
      enabled: typeof d.enabled === "boolean" ? d.enabled : true,
      include_page_content: typeof d.include_page_content === "boolean" ? d.include_page_content : false,
      anchor_date_property: typeof d.anchor_date_property === "string" ? d.anchor_date_property : "",
      selected_properties: Array.isArray(d.selected_properties)
        ? d.selected_properties
            .filter((p): p is Record<string, unknown> => isObject(p))
            .reduce<Array<{ name: string; type: NotionPropertyType }>>((acc, p) => {
              const name = typeof p.name === "string" ? p.name : "";
              const type = typeof p.type === "string" ? (p.type as NotionPropertyType) : null;
              if (!name || !type) return acc;
              acc.push({ name, type });
              return acc;
            }, [])
        : [],
    }));

  return {
    notion_token: c.notion_token,
    gemini_api_key: c.gemini_api_key,
    output_database_ids: { daily: out.daily, weekly: out.weekly },
    source_databases,
  };
}

function getStepTitle(step: WizardStep) {
  if (step === 0) return "🔑 Tokens";
  if (step === 1) return "🗃️ Source Databases";
  if (step === 2) return "🧩 Select Properties";
  if (step === 3) return "✅ Review & Save";
  return "📅 Dashboard";
}

export default function SetupWizard() {
  const [isDark, setIsDark] = useState(false);
  const t = useMemo(() => getNotionLikeThemeClasses(isDark), [isDark]);

  const [step, setStep] = useState<WizardStep>(0);
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [bannerError, setBannerError] = useState<string>("");
  const [propertyStateByDbId, setPropertyStateByDbId] = useState<Record<string, DbPropertyState>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runtimeSelection, setRuntimeSelection] = useState<RuntimeDateSelection>({
    mode: "single",
    date: new Date().toISOString().slice(0, 10),
  });

  const doneTokens = config.notion_token.trim().length > 0;
  const doneDatabases = config.source_databases.length > 0 && config.source_databases.every((d) => d.database_id.trim().length > 0);
  const doneProperties =
    config.source_databases.length > 0 &&
    config.source_databases
      .filter((d) => d.enabled)
      .every((d) => d.selected_properties.length > 0);

  const canGoNext =
    (step === 0 && doneTokens) ||
    (step === 1 && doneDatabases) ||
    (step === 2 && doneProperties) ||
    (step === 3 && saveSuccess) ||
    step === 4;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingPrefill(true);
      setBannerError("");
      try {
        const res = await fetch("/api/config", { method: "GET" });
        const data = (await res.json()) as unknown;
        const cfg = safeConfigFromApi(data);
        if (active && cfg) setConfig(cfg);
      } catch (e: unknown) {
        if (!active) return;
        const message = e instanceof Error ? e.message : String(e);
        setBannerError(message || "Failed to prefill from config.json");
      } finally {
        if (active) setLoadingPrefill(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function goNext() {
    setBannerError("");
    setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev));
  }

  function goBack() {
    setBannerError("");
    setStep((prev) => (prev > 0 ? ((prev - 1) as WizardStep) : prev));
  }

  async function save() {
    setSaving(true);
    setBannerError("");
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = (await res.json()) as unknown;
      if (!res.ok) {
        const msg = isObject(data) && typeof data.error === "string" ? data.error : "Failed to save config";
        setBannerError(msg);
        return;
      }

      setSaveSuccess(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setBannerError(message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { label: "Tokens", done: doneTokens },
    { label: "Databases", done: doneDatabases },
    { label: "Properties", done: doneProperties },
    { label: "Save", done: saveSuccess },
    { label: "Dashboard", done: false },
  ];

  return (
    <div className={t.app}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={cx("text-lg font-semibold", t.heading)}>Setup Wizard</div>
          <div className={cx("mt-1 text-sm", t.subtleText)}>
            Notion-like, step-by-step config for multiple source databases.
          </div>
        </div>

        <button type="button" onClick={() => setIsDark((v) => !v)} className={t.buttonGhost} aria-label="Toggle theme">
          {isDark ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      {bannerError && <div className={cx("mt-4", t.dangerBanner)}>{bannerError}</div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          {steps.map((s, i) => (
            <StepPill key={s.label} index={i} label={s.label} active={step === i} done={s.done} isDark={isDark} />
          ))}
          <div className="pt-2">
            <Callout emoji="💡" title="Tip" isDark={isDark}>
              You can keep output database IDs empty for now; they’re placeholders.
            </Callout>
          </div>
        </div>

        <div className={t.panel}>
          <div className="flex items-center justify-between gap-3">
            <div className={cx("text-sm font-semibold", t.heading)}>{getStepTitle(step)}</div>
            {loadingPrefill && <div className={cx("text-xs", t.subtleText)}>Loading existing config…</div>}
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && <StepTokens config={config} setConfig={setConfig} isDark={isDark} />}
                {step === 1 && <StepDatabases config={config} setConfig={setConfig} isDark={isDark} />}
                {step === 2 && (
                  <StepProperties
                    config={config}
                    setConfig={setConfig}
                    isDark={isDark}
                    propertyStateByDbId={propertyStateByDbId}
                    setPropertyStateByDbId={setPropertyStateByDbId}
                  />
                )}
                {step === 3 && (
                  <StepReview config={config} isDark={isDark} saving={saving} saveSuccess={saveSuccess} onSave={() => void save()} />
                )}
                {step === 4 && (
                  <StepDashboard
                    isDark={isDark}
                    selection={runtimeSelection}
                    setSelection={setRuntimeSelection}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" className={t.buttonSecondary} onClick={goBack} disabled={step === 0 || saving}>
              ← Back
            </button>
            <div className={cx("text-xs", t.subtleText)}>Step {step + 1} / 5</div>
            <button
              type="button"
              className={t.buttonPrimary}
              onClick={goNext}
              disabled={!canGoNext || step === 4 || saving}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
