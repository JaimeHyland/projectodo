import { requireAdminDashboardAccess } from "@/lib/server-authorization";
import en from "@/messages/news/en.json";
import de from "@/messages/news/de.json";
import es from "@/messages/news/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface NewsPageProps {
  params: Promise<{ locale: string }>;
}


export default async function NewsPage({ params }: NewsPageProps) {
  const { locale } = await params;
  await requireAdminDashboardAccess(locale);

  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <PageShell title={messages.titleNews} accent="blue" maxWidth="4xl">
      <ContentPanel className="min-h-40 bg-[#e8f2f6]" />
    </PageShell>
  );
}
