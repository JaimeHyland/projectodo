import en from "@/messages/lessons/en.json";
import de from "@/messages/lessons/de.json";
import es from "@/messages/lessons/es.json";

interface LessonsPageProps {
  params: { locale: string };
}


export default async function LessonsPage({ params }: LessonsPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleLessons}</h1>
    </main>
  );
}
