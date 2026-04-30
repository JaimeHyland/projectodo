import en from "@/messages/guestbook/en.json";
import de from "@/messages/guestbook/de.json";
import es from "@/messages/guestbook/es.json";

interface GuestbookPageProps {
  params: Promise<{ locale: string }>;
}


export default async function GuestbookPage({ params }: GuestbookPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const guestbook = messages.guestbook;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleGuestbook}</h1>

      <p>{guestbook.intro}</p>

      <section className="rounded-md border p-6">
        <p>{guestbook.emptyState}</p>
      </section>
    </main>
  );
}
