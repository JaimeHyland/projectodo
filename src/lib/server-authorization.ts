import { notFound, redirect } from 'next/navigation';

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

export async function requireAdminDashboardAccess(locale: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}?auth=login`);
  }

  if (!user.isSuperuser && !user.groups.includes('webmaster')) {
    notFound();
  }

  return user;
}
