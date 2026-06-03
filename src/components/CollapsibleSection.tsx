"use client";

import { useState, useEffect, ReactNode, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useActiveId } from "@/components/CollapsibleContext";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
};

export function CollapsibleSection({ title, children, defaultOpen, id }: Props) {
  const activeId = useActiveId();
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen ?? true);
  const userToggled = useRef(false);

  useEffect(() => {
    if (!userToggled.current && id && activeId !== "ALL") {
      setIsOpen(activeId === "ALL");
    }
  }, [activeId, id]);

  return (
    <section>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left">
        <h2
          id={id}
          className="text-xl font-semibold border-t border-black bg-gray-300 pt-2 pb-2 pl-3 pr-3 flex items-center justify-between"
        >
          {title}
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </h2>
      </button>

      {isOpen && <div className="px-2 pb-4 mt-2 mb-4">{children}</div>}
    </section>
  );
}
