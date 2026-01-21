import en from "@/messages/contact/en.json";
import de from "@/messages/contact/de.json";
import es from "@/messages/contact/es.json";

interface ContactPageProps {
  params: { locale: string };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;
  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleContact}</h1>
    </main>
  );
}
