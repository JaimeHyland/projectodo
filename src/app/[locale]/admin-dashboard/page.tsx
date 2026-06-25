import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/server-authorization';
import { serverApiFetch } from '@/lib/server-api';
import { CollapsibleSection } from '@/components/CollapsibleSection';

import type {
  AdminUser,
  AdminBand,
  LessonLocation,
} from "@/types/admin";

import AdminUsersTable from "./AdminUsersTable";
import AdminLocationsTable from "./AdminLocationsTable";
import AdminBandsTable from "./AdminBandsTable";

import en from "@/messages/admin-dashboard/en.json";
import de from "@/messages/admin-dashboard/de.json";
import es from "@/messages/admin-dashboard/es.json";

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>;
}

type UserGroupCounts = {
  total: number;
  ordinary: number;
  superusers: number;
  webmasters: number;
  teachers: number;
  students: number;
  band_leaders: number;
  press: number;
};

type AdminUserListResponse = {
  users: AdminUser[];
};

type LocationsResponse = {
  locations: LessonLocation[];
};

type BandsResponse = {
  bands: AdminBand[];
};


async function getUserGroupCounts(): Promise<UserGroupCounts | null> {
  const response = await serverApiFetch("/api/auth/user-group-counts/");

  if (!response.ok) {
    const errorText = await response.text();
    console.error("user-group-counts failed", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });

    return null;
  }

  return response.json();
}

async function getAdminUsers(): Promise<AdminUser[] | null> {
  const response = await serverApiFetch("/api/auth/users/");

  if (!response.ok) {
    const errorText = await response.text();
    console.error("admin users failed", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    return null;
  }

  const data: AdminUserListResponse = await response.json();
  return data.users;
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const user = await getCurrentUser();
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  if (!user) {
    redirect(`/${locale}?auth=login`);
  }

  const canViewAdminDashboard =
    user.isSuperuser || user.groups.includes('webmaster');

  if (!canViewAdminDashboard) {
    notFound();
  }

  const counts = await getUserGroupCounts();
  const adminUsers = await getAdminUsers();
  const locations = await getLocations();
  const bands = await getAdminBands();

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleAdminDashboard}</h1>
      <p className="mb-8 text-lg">{messages.descriptionAdminDashboard}</p>

      <CollapsibleSection title={messages.sectionUserStats} defaultOpen={false}>
        {counts ? (
          <dl className="grid grid-cols-2 gap-3">
            <dt className="font-medium">{messages.totalUsers}</dt>
            <dd>{counts.total}</dd>

            <dt className="font-medium">{messages.ordinary}</dt>
            <dd>{counts.ordinary}</dd>

            <dt className="font-medium">{messages.superusers}</dt>
            <dd>{counts.superusers}</dd>

            <dt className="font-medium">{messages.webmasters}</dt>
            <dd>{counts.webmasters}</dd>

            <dt className="font-medium">{messages.teachers}</dt>
            <dd>{counts.teachers}</dd>

            <dt className="font-medium">{messages.students}</dt>
            <dd>{counts.students}</dd>

            <dt className="font-medium">{messages.bandLeaders}</dt>
            <dd>{counts.band_leaders}</dd>

            <dt className="font-medium">{messages.press}</dt>
            <dd>{counts.press}</dd>
          </dl>
        ) : (
          <p>{messages.couldNotLoadUserStats}</p>
        )}
      </CollapsibleSection>
      <CollapsibleSection title={messages.sectionUsers} defaultOpen={false}>
        {adminUsers ? (
          <AdminUsersTable
          users={adminUsers}
          messages={messages}
        />
        ) : (
          <p>{messages.couldNotLoadUsers}</p>
        )}
      </CollapsibleSection>
      <CollapsibleSection title={messages.sectionLocations} defaultOpen={false}>
        {locations ? (
          <AdminLocationsTable locations={locations} messages={messages} />
        ) : (
          <p>{messages.couldNotLoadLocations}</p>
        )}
      </CollapsibleSection>
      <CollapsibleSection title={messages.sectionBands} defaultOpen={false}>
        {bands ? (
          <AdminBandsTable
          bands={bands}
          users={adminUsers ?? []}
          messages={messages}
          locale={locale}
          />
        ) : (
          <p>{messages.couldNotLoadBands}</p>
        )}
      </CollapsibleSection>
    </main>
  );
}

async function getLocations(): Promise<LessonLocation[] | null> {
  const response = await serverApiFetch("/api/courses/locations/");

  if (!response.ok) {
    return null;
  }

  const data: LocationsResponse = await response.json();
  return data.locations;
}

async function getAdminBands(): Promise<AdminBand[] | null> {
  const response = await serverApiFetch("/api/bands/admin/bands/");

  if (!response.ok) {
    const errorText = await response.text();
    console.error("admin bands failed", {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });

    return null;
  }

  const data: BandsResponse = await response.json();
  return data.bands;
}
