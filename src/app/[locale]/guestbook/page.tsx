import { requireAdminDashboardAccess } from "@/lib/server-authorization";
import en from "@/messages/guestbook/en.json";
import de from "@/messages/guestbook/de.json";
import es from "@/messages/guestbook/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface GuestbookPageProps {
  params: Promise<{ locale: string }>;
}


export default async function GuestbookPage({ params }: GuestbookPageProps) {
  const { locale } = await params;
  await requireAdminDashboardAccess(locale);

  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const guestbook = messages.guestbook;

  return (
    <PageShell title={messages.titleGuestbook} accent="orange" maxWidth="4xl">
      <ContentPanel className="space-y-6 text-center leading-7 text-[#514f4b]">
        <p>{guestbook.intro}</p>
        <div className="rounded-xl border border-dashed border-black/20 bg-[#faf8f3] p-6">
          <p>{guestbook.emptyState}</p>
        </div>
      </ContentPanel>
    </PageShell>
  );
}
