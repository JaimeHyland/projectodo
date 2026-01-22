
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import es from "@/messages/es.json";

interface HomePageProps {
  params: { locale: string };
}


export default async function HomePage({ params }: HomePageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleHome}</h1>
    </main>
  );
}
