export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = ["en", "de", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
