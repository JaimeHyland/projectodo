"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useActiveId } from "@/components/CollapsibleContext";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  variant?: "default" | "soft";
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
    <section className={variant === "soft" ? "overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_25px_rgba(55,49,40,0.06)]" : undefined}>
      <button
        onClick={() => {
          setUserToggled(true);
          setIsOpen(!displayedIsOpen);
        }}
        className="w-full text-left"
      >
        <h2
          id={id}
          className={
            variant === "soft"
              ? "flex items-center justify-between bg-[#e7eef0] px-6 py-4 text-xl font-semibold"
              : "flex items-center justify-between border-t border-black bg-gray-300 px-3 py-2 text-xl font-semibold"
          }
        >
          {title}
          {displayedIsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </h2>
      </button>

      {displayedIsOpen && (
        <div className={variant === "soft" ? "p-6" : "mb-4 mt-2 px-2 pb-4"}>
          {children}
        </div>
      )}
    </section>
  );
}
