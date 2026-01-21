import en from "@/messages/news/en.json";
import de from "@/messages/news/de.json";
import es from "@/messages/news/es.json";

interface NewsPageProps {
  params: { locale: string };
}


export default async function NewsPage({ params }: NewsPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleNews}</h1>
    </main>
  );
}
