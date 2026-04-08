import en from "@/messages/bands/en.json";
import de from "@/messages/bands/de.json";
import es from "@/messages/bands/es.json";

interface BandsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BandsPage({ params }: BandsPageProps) {
  const { locale } =  await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleBands}</h1>
    </main>
  );
}
