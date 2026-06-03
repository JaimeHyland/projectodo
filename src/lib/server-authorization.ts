// src/lib/server-authorization.ts
import { cookies } from 'next/headers';

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:8000';

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const res = await fetch(`${API_BASE}/api/auth/status/`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const data = await res.json();

  if (!data?.is_authenticated) return null;

  return {
    username: data.username,
    isSuperuser: data.is_superuser,
    groups: data.groups ?? [],
  };
}
