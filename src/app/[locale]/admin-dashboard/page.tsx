import { requireAdminDashboardAccess } from '@/lib/server-authorization';
import { serverApiFetch } from '@/lib/server-api';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageShell } from '@/components/PageShell';

import type {
  AdminUser,
  AdminBand,
  LessonLocation,
} from "@/types/admin";

import AdminUsersTable from "./AdminUsersTable";
import AdminLocationsTable, { type AppLocale } from "./AdminLocationsTable";
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
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  await requireAdminDashboardAccess(locale);

  const counts = await getUserGroupCounts();
  const adminUsers = await getAdminUsers();
  const locations = await getLocations();
  const bands = await getAdminBands();

  const appLocale: AppLocale =
  locale === "de" || locale === "es" || locale === "en" ? locale : "en";

  return (
    <PageShell
      title={messages.titleAdminDashboard}
      meta={messages.descriptionAdminDashboard}
      accent="gray"
      maxWidth="6xl"
      density="compact"
    >
      <div className="space-y-3">
      <CollapsibleSection title={messages.sectionUserStats} defaultOpen={false} variant="admin">
        {counts ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
            {[
              [messages.totalUsers, counts.total],
              [messages.ordinary, counts.ordinary],
              [messages.superusers, counts.superusers],
              [messages.webmasters, counts.webmasters],
              [messages.teachers, counts.teachers],
              [messages.students, counts.students],
              [messages.bandLeaders, counts.band_leaders],
              [messages.press, counts.press],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-black/10 bg-[#f7f5f0] px-2 py-2 text-center sm:px-3"
              >
                <dt className="text-xs font-semibold uppercase leading-tight tracking-wide text-[#68645e]">
                  {label}
                </dt>
                <dd className="mt-1.5 text-xl font-bold leading-none text-[#292826]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>{messages.couldNotLoadUserStats}</p>
        )}
      </CollapsibleSection>
      <CollapsibleSection title={messages.sectionUsers} defaultOpen={false} variant="admin">
        {adminUsers ? (
          <AdminUsersTable
          users={adminUsers}
          messages={messages}
        />
        ) : (
          <p>{messages.couldNotLoadUsers}</p>
        )}
      </CollapsibleSection>
      <CollapsibleSection title={messages.sectionLocations} defaultOpen={false} variant="admin">
        {locations ? (
          <AdminLocationsTable
            locations={locations}
            messages={messages}
            locale={appLocale}
          />
        ) : (
          <p>{messages.couldNotLoadLocations}</p>
        )}
      </CollapsibleSection>
      
      <CollapsibleSection title={messages.sectionBands} defaultOpen={false} variant="admin">
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
      </div>
    </PageShell>
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
