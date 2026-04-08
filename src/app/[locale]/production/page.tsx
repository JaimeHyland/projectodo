import en from "@/messages/production/en.json";
import de from "@/messages/production/de.json";
import es from "@/messages/production/es.json";

interface ProductionPageProps {
  params: Promise<{ locale: string }>;
}


export default async function ProductionPage({ params }: ProductionPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleProduction}</h1>
    </main>
  );
}
