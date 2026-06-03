"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CollapsibleContext = createContext<string>("ALL");

export function useActiveId() {
  return useContext(CollapsibleContext);
}

export function AnchorAwareCollapsibleController({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string>("ALL");

  // Handles hash on initial page load
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash) {
      setActiveId(hash.replace(/^#/, ""));
    }
  }, []);

  // Handles hash changes after load (e.g. user clicks anchor links)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        setActiveId(hash.replace(/^#/, ""));
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return <CollapsibleContext.Provider value={activeId}>{children}</CollapsibleContext.Provider>;
}
