// src/lib/locale.ts
import Cookies from "js-cookie";

export const SUPPORTED_LOCALES = ["en", "de", "es"];
export const DEFAULT_LOCALE = "en";

export function getCurrentLocale(pathname: string) {
  const pathParts = pathname.split("/");
  return SUPPORTED_LOCALES.includes(pathParts[1]) ? pathParts[1] : DEFAULT_LOCALE;
}

export function switchLocale(pathname: string, locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale)) return pathname;
  const newPath = `/${locale}${pathname.slice(3)}`; // remove old /xx prefix
  Cookies.set("NEXT_LOCALE", locale, { expires: 365 });
  return newPath;
}
