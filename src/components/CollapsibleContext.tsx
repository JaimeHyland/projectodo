"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const CollapsibleContext = createContext<string>("ALL");

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getActiveHash() {
  return window.location.hash.slice(1) || "ALL";
}

function getServerHash() {
  return "ALL";
}

export function useActiveId() {
  return useContext(CollapsibleContext);
}

export function AnchorAwareCollapsibleController({ children }: { children: React.ReactNode }) {
  const activeId = useSyncExternalStore(subscribeToHash, getActiveHash, getServerHash);

  return <CollapsibleContext.Provider value={activeId}>{children}</CollapsibleContext.Provider>;
}
