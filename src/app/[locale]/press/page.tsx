import { requireAdminDashboardAccess } from '@/lib/server-authorization';

import en from "@/messages/press/en.json";
import de from "@/messages/press/de.json";
import es from "@/messages/press/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";


interface PressPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PressPage({ params }: PressPageProps) {
  const { locale } = await params;
  await requireAdminDashboardAccess(locale);

  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
  
    <PageShell title={messages.titlePress} accent="purple" maxWidth="4xl">
      <ContentPanel className="min-h-40 bg-[#eeeaf3]" />
    </PageShell>
  )
}
