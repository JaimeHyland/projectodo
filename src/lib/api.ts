export function apiUrl(path: string) {
  if (!path.endsWith("/")) path += "/";
  return `/api/${path}`;
}