import { cx } from "./theme";

export function StepPill({
  index,
  label,
  active,
  done,
  isDark,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
  isDark: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-xl border px-3 py-2",
        isDark ? "border-white/10" : "border-zinc-200",
        active ? (isDark ? "bg-white/5" : "bg-zinc-50") : "bg-transparent",
      )}
    >
      <div
        className={cx(
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
          done
            ? isDark
              ? "bg-emerald-400/20 text-emerald-200"
              : "bg-emerald-50 text-emerald-700"
            : active
              ? isDark
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-900 text-white"
              : isDark
                ? "bg-white/5 text-zinc-300"
                : "bg-zinc-100 text-zinc-600",
        )}
      >
        {index + 1}
      </div>
      <div className={cx("text-sm font-medium", isDark ? "text-zinc-100" : "text-zinc-900")}>{label}</div>
    </div>
  );
}

