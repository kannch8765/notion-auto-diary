import { cx, getNotionLikeThemeClasses } from "./theme";

export function Callout({
  emoji,
  title,
  children,
  isDark,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  const t = getNotionLikeThemeClasses(isDark);
  return (
    <div className={t.callout}>
      <div className="flex items-start gap-3">
        <div className="text-xl leading-none">{emoji}</div>
        <div className="min-w-0">
          <div className={cx("text-sm font-semibold", t.heading)}>{title}</div>
          <div className={cx("mt-1 text-sm", t.subtleText)}>{children}</div>
        </div>
      </div>
    </div>
  );
}

