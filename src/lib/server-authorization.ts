import { serverApiFetch } from './server-api';


export async function getCurrentUser() {
  const response = await serverApiFetch("/api/auth/status/");

  if (!response.ok) return null;

  const data = await response.json();

  if (!data?.is_authenticated) return null;

  return {
    username: data.username,
    isSuperuser: data.is_superuser,
    groups: data.groups ?? [],
  };
}
