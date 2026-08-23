import { notFound } from "next/navigation";

import { serverApiFetch } from "@/lib/server-api";
import { requireAdminDashboardAccess } from "@/lib/server-authorization";
import BandWebpageBuilder from "./BandWebpageBuilder";

type PageProps = {
  params: Promise<{
    locale: string;
    bandId: string;
  }>;
};

async function getBandPage(bandId: string) {
  const response = await serverApiFetch(`/api/bands/admin/bands/${bandId}/page/`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    notFound();
  }

  return response.json();
}

export default async function BandWebpageBuilderPage({ params }: PageProps) {
  const { locale, bandId } = await params;
  await requireAdminDashboardAccess(locale);

  const page = await getBandPage(bandId);

  return (
    <BandWebpageBuilder
      locale={locale}
      bandId={bandId}
      page={page}
    />
  );
}
