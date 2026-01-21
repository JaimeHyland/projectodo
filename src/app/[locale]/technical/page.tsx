import en from "@/messages/technical/en.json";
import de from "@/messages/technical/de.json";
import es from "@/messages/technical/es.json";

interface TechnicalPageProps {
  params: { locale: string };
}


export default async function TechnicalPage({ params }: TechnicalPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleTechnical}</h1>
    </main>
  );
}
