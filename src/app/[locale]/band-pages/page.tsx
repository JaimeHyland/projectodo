import en from "@/messages/band-pages/en.json";
import de from "@/messages/band-pages/de.json";
import es from "@/messages/band-pages/es.json";

interface BandPagesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BandPagesPage({ params }: BandPagesPageProps) {
  const { locale } =  await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleBandPages}</h1>
    </main>
  );
}