import { redirect, notFound } from 'next/navigation';
import { cookies } from "next/headers";
import { getCurrentUser } from '@/lib/server-authorization';
import { CollapsibleSection } from '@/components/CollapsibleSection';

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
  superuserRole: number;
  webmasterRole: number;
  teacherRole: number;
  studentRole: number;
  bandLeaderRole: number;
  pressRole: number;
};

type AdminUser = {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  is_current_user: boolean;
  groups: string[];
};

type AdminUserListResponse = {
  users: AdminUser[];
};

type LessonLocation = {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

type LocationsResponse = {
  locations: LessonLocation[];
};

type AdminBand = {
  id: number;
  name: string;
  can_manage: boolean;
  description: string;
  contact_email: string;
  contact_tel: string;
  website_url: string;
  social_media_urls: { platform: string; url: string }[];
  band_members: { name: string; instrument_or_role: string }[];
  genres: string[];
  band_leader: {
    id: number;
    username: string;
    email: string;
  };
};

type BandsResponse = {
  bands: AdminBand[];
};

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:8000';

async function getUserGroupCounts(): Promise<UserGroupCounts | null> {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const res = await fetch(`${API_BASE}/api/auth/user-group-counts/`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("user-group-counts failed", {
      status: res.status,
      statusText: res.statusText,
      body: errorText,
    });

    return null;
  }

  return res.json();
}

async function getAdminUsers(): Promise<AdminUser[] | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const res = await fetch(`${API_BASE}/api/auth/users/`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error("admin users failed", {
      status: res.status,
      statusText: res.statusText,
      body: errorText,
    });
    return null;
  }

  const data: AdminUserListResponse = await res.json();
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
            <dd>{counts.superuserRole}</dd>

            <dt className="font-medium">{messages.webmasters}</dt>
            <dd>{counts.webmasterRole}</dd>

            <dt className="font-medium">{messages.teachers}</dt>
            <dd>{counts.teacherRole}</dd>

            <dt className="font-medium">{messages.students}</dt>
            <dd>{counts.studentRole}</dd>

            <dt className="font-medium">{messages.bandLeaders}</dt>
            <dd>{counts.bandLeaderRole}</dd>

            <dt className="font-medium">{messages.press}</dt>
            <dd>{counts.pressRole}</dd>
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
          <AdminBandsTable bands={bands} messages={messages} />
        ) : (
          <p>{messages.couldNotLoadBands}</p>
        )}
      </CollapsibleSection>
    </main>
  );
}

async function getLocations(): Promise<LessonLocation[] | null> {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(`${API_BASE}/api/classes/locations/`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const data: LocationsResponse = await res.json();
  return data.locations;
}

async function getAdminBands(): Promise<AdminBand[] | null> {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(`${API_BASE}/api/bands/admin/bands/`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("admin bands failed", {
      status: res.status,
      statusText: res.statusText,
      body: errorText,
    });

    return null;
  }

  const data: BandsResponse = await res.json();
  return data.bands;
}
