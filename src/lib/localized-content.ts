// An explicit blank translation is valid; absent translations retain the legacy text.
export function localizedText(translations: Record<string, string> | undefined, locale: string, legacy = "") {
  return translations?.[locale] ?? legacy;
}
