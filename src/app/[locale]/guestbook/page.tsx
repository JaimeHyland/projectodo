import en from "@/messages/guestbook/en.json";
import de from "@/messages/guestbook/de.json";
import es from "@/messages/guestbook/es.json";

interface GuestbookPageProps {
  params: { locale: string };
}


export default async function GuestbookPage({ params }: GuestbookPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleGuestbook}</h1>
    </main>
  );
}

