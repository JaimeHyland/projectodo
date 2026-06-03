// lib/permissions.ts
export type User = {
  username: string;
  isSuperuser: boolean;
  groups: string[];
};

export function canViewPress(user: User | null) {
  return (
    !!user &&
    (user.isSuperuser ||
      user.groups.includes('press') ||
      user.groups.includes('webmaster'))
  );
}

export function canViewAdminDashboard(user: User | null) {
  return (
    !!user &&
    (user.isSuperuser || user.groups.includes('webmaster'))
  );
}

export function canViewGuestbook(user: User | null) {
  return !!user;
}