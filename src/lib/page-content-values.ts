type PathPart = string | number | { id: string };
type ContentField = { id: string; page: string; path: PathPart[] };

// Preserve array order and match home cards by ID across differently ordered locales.
export function applyPageContent<T extends object>(
  page: string, fallback: T, values: Record<string, unknown>, fields: ContentField[],
): T {
  const result = structuredClone(fallback);
  for (const field of fields) {
    if (field.page !== page || !Object.hasOwn(values, field.id)) continue;
    const value = values[field.id];
    if (typeof value !== "string") continue;
    let target: unknown = result;
    for (const part of field.path.slice(0, -1)) {
      if (typeof part === "object") {
        target = Array.isArray(target) ? target.find(item => item.id === part.id) : undefined;
      } else {
        target = target && typeof target === "object" ? (target as Record<string | number, unknown>)[part] : undefined;
      }
    }
    const leaf = field.path[field.path.length - 1];
    if (target && typeof target === "object" && typeof leaf !== "object") {
      (target as Record<string | number, unknown>)[leaf] = value;
    }
  }
  return result;
}
