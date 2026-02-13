export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function getNotionLikeThemeClasses(isDark: boolean) {
  return {
    app: cx(
      "min-h-[640px] w-full",
      "rounded-2xl border",
      "p-6 md:p-8",
      isDark
        ? "bg-[#0f0f10] text-zinc-100 border-white/10"
        : "bg-white text-zinc-900 border-zinc-200",
    ),
    subtleText: isDark ? "text-zinc-400" : "text-zinc-500",
    heading: isDark ? "text-zinc-50" : "text-zinc-900",
    panel: cx(
      "rounded-xl border p-4",
      isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200",
    ),
    input: cx(
      "w-full rounded-lg border px-3 py-2 text-sm outline-none",
      "transition-colors",
      isDark
        ? "bg-black/30 border-white/10 text-zinc-100 placeholder:text-zinc-500 focus:border-white/25"
        : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400",
    ),
    buttonPrimary: cx(
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
      "transition-colors",
      isDark ? "bg-zinc-100 text-zinc-900 hover:bg-white" : "bg-zinc-900 text-white hover:bg-black",
    ),
    buttonSecondary: cx(
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
      "transition-colors border",
      isDark
        ? "bg-transparent border-white/10 text-zinc-100 hover:bg-white/5"
        : "bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50",
    ),
    buttonGhost: cx(
      "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium",
      "transition-colors",
      isDark ? "text-zinc-200 hover:bg-white/5" : "text-zinc-700 hover:bg-zinc-100",
    ),
    callout: cx(
      "rounded-xl border p-4",
      isDark ? "bg-[#111827] border-white/10" : "bg-[#eff6ff] border-blue-200",
    ),
    dangerBanner: cx(
      "rounded-xl border p-3 text-sm",
      isDark ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-red-200 bg-red-50 text-red-800",
    ),
  };
}

