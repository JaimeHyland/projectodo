import { requireAdminDashboardAccess } from '@/lib/server-authorization';
import { serverApiFetch } from '@/lib/server-api';
import { CollapsibleSection } from '@/components/CollapsibleSection';

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
    <main className="p-4 text-center sm:p-8">
      <h1 className="text-2xl font-bold">{messages.titleAdminDashboard}</h1>
      <p className="mb-8 text-lg">{messages.descriptionAdminDashboard}</p>

      <CollapsibleSection title={messages.sectionUserStats} defaultOpen={false}>
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
                className="min-w-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-2 sm:px-3"
              >
                <dt className="text-xs font-medium leading-tight text-gray-600">
                  {label}
                </dt>
                <dd className="mt-1 text-xl font-semibold leading-none text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
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
          <AdminLocationsTable
            locations={locations}
            messages={messages}
            locale={appLocale}
          />
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
