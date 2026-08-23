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
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl";
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
  maxWidth = "4xl",
}: PageShellProps) {
  return (
    <main className="bg-[#f5f2eb] px-4 py-8 text-[#292826] sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className={`mx-auto space-y-6 sm:space-y-8 ${widthClasses[maxWidth]}`}>
        <header className="rounded-2xl border border-black/10 bg-white px-6 py-7 shadow-[0_10px_32px_rgba(55,49,40,0.08)] sm:px-9 sm:py-9">
          <div className={`mb-5 h-1 w-14 rounded-full ${accentClasses[accent]}`} />
          <h1 className="text-3xl font-bold tracking-tight text-[#22211f] sm:text-4xl">
            {title}
          </h1>
          {meta && <div className="mt-3 text-sm text-[#68645e]">{meta}</div>}
        </header>

        {children}
      </div>
    </main>
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
