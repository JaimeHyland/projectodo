import type { CSSProperties, ReactNode } from "react";

type PageAccent = "orange" | "gold" | "green" | "blue" | "purple" | "gray";

const accentClasses: Record<PageAccent, string> = {
  orange: "bg-[#c27a4a]",
  gold: "bg-[#d5a300]",
  green: "bg-[#789849]",
  blue: "bg-[#6d9db5]",
  purple: "bg-[#8b7897]",
  gray: "bg-[#8b8b85]",
};

type PageShellProps = {
  title: string;
  children: ReactNode;
  accent?: PageAccent;
  meta?: ReactNode;
  metaClassName?: string;
  metaInline?: boolean;
  headerExtra?: ReactNode;
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl";
  density?: "default" | "compact";
};

const widthClasses = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

export function PageShell({
  title,
  children,
  accent = "orange",
  meta,
  metaClassName = "",
  metaInline = false,
  headerExtra,
  maxWidth = "4xl",
  density = "default",
}: PageShellProps) {
  const compact = density === "compact";

  return (
    <div
      className={
        compact
          ? "bg-[#f5f2eb] px-3 py-3 text-[#292826] sm:px-5 sm:py-4 lg:px-6"
          : "bg-[#f5f2eb] px-4 py-8 text-[#292826] sm:px-6 sm:py-12 lg:px-8 lg:py-14"
      }
    >
      <div
        className={`mx-auto ${compact ? "space-y-4" : "space-y-6 sm:space-y-8"} ${widthClasses[maxWidth]}`}
      >
        <header
          className={
            compact
              ? "rounded-xl border border-black/10 bg-white px-5 pb-2 pt-4 shadow-[0_8px_24px_rgba(55,49,40,0.07)] sm:px-6 sm:pb-2 sm:pt-5"
              : "rounded-2xl border border-black/10 bg-white px-6 py-7 shadow-[0_10px_32px_rgba(55,49,40,0.08)] sm:px-9 sm:py-9"
          }
        >
          <div
            className={`${compact ? "mb-3 h-0.5 w-12" : "mb-5 h-1 w-14"} rounded-full ${accentClasses[accent]}`}
          />
          <div className={metaInline ? "sm:flex sm:items-baseline sm:gap-4" : undefined}>
            <h1
              className={`${compact ? "text-2xl" : "text-3xl sm:text-4xl"} shrink-0 font-bold tracking-tight text-[#22211f]`}
            >
              {title}
            </h1>
            {meta && (
              <div
                className={`${metaInline ? "mt-2 sm:mt-0" : compact ? "mt-2" : "mt-3"} text-sm text-[#68645e] ${metaClassName}`}
              >
                {meta}
              </div>
            )}
          </div>
          {headerExtra && (
            <div
              className={
                compact
                  ? "-mx-5 mt-2 border-t border-black/10 px-5 pt-1.5 sm:-mx-6 sm:px-6"
                  : "mt-6 border-t border-black/10 pt-5"
              }
            >
              {headerExtra}
            </div>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}

type ContentPanelProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function ContentPanel({ children, className = "", style }: ContentPanelProps) {
  return (
    <section
      className={`rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_25px_rgba(55,49,40,0.06)] sm:p-8 ${className}`}
      style={style}
    >
      {children}
    </section>
  );
}
