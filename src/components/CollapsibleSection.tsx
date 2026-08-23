"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useActiveId } from "@/components/CollapsibleContext";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  variant?: "default" | "soft" | "admin" | "subbar";
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen,
  id,
  variant = "default",
}: Props) {
  const activeId = useActiveId();
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen ?? true);
  const [userToggled, setUserToggled] = useState(false);
  const displayedIsOpen =
    !userToggled && id && activeId !== "ALL"
      ? activeId === id
      : isOpen;

  return (
    <section
      className={
        variant === "soft"
          ? "overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_25px_rgba(55,49,40,0.06)]"
          : variant === "admin"
            ? "overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_6px_20px_rgba(55,49,40,0.05)]"
            : undefined
      }
    >
      <button
        onClick={() => {
          setUserToggled(true);
          setIsOpen(!displayedIsOpen);
        }}
        className={variant === "subbar" ? "w-fit text-left" : "w-full text-left"}
        aria-expanded={displayedIsOpen}
      >
        <h2
          id={id}
          className={
            variant === "soft"
              ? "flex items-center justify-between bg-[#e7eef0] px-6 py-4 text-xl font-semibold"
              : variant === "admin"
                ? "flex items-center justify-between border-l-4 border-l-[#8b8b85] bg-[#f0eee8] px-4 py-2.5 text-base font-semibold text-[#302e2b] transition-colors hover:bg-[#e9e6de]"
                : variant === "subbar"
                  ? "inline-flex items-center gap-1.5 py-0 text-sm font-semibold text-[#5f5a53] transition-colors hover:text-black"
                : "flex items-center justify-between border-t border-black bg-gray-300 px-3 py-2 text-xl font-semibold"
          }
        >
          {title}
          {displayedIsOpen ? (
            <ChevronUp size={variant === "subbar" ? 14 : 20} />
          ) : (
            <ChevronDown size={variant === "subbar" ? 14 : 20} />
          )}
        </h2>
      </button>

      {displayedIsOpen && (
        <div
          className={
            variant === "soft"
              ? "p-6"
              : variant === "admin"
                ? "p-3 text-left sm:p-4"
                : variant === "subbar"
                  ? "mt-1 border-t border-black/10 pt-1.5"
                : "mb-4 mt-2 px-2 pb-4"
          }
        >
          {children}
        </div>
      )}
    </section>
  );
}
