import "server-only";
import { cache } from "react";
import catalogue from "../../backend/core/cms_catalogue.json";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/config";
import { serverApiFetch } from "./server-api";
import { applyPageContent } from "./page-content-values";

const loadValues = cache(async (page: string, locale: string): Promise<Record<string, unknown>> => {
  try {
    const response = await serverApiFetch(`/api/content/public/${page}/${locale}/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return {};
    const data = await response.json();
    return data?.values && typeof data.values === "object" && !Array.isArray(data.values) ? data.values : {};
  } catch {
    return {};
  }
});

export async function getPageContent<T extends object>(page: string, locale: string, fallback: T): Promise<T> {
  const selected = SUPPORTED_LOCALES.some(code => code === locale) ? locale : DEFAULT_LOCALE;
  return applyPageContent(page, fallback, await loadValues(page, selected), catalogue.fields);
}
