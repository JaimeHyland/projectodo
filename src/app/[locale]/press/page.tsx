import en from "@/messages/press/en.json";
import de from "@/messages/press/de.json";
import es from "@/messages/press/es.json";

interface PressPageProps {
  params: { locale: string };
}


export default async function PressPage({ params }: PressPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titlePress}</h1>
    </main>
  );
}
