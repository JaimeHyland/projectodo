import en from "@/messages/lesson-pages/en.json";
import de from "@/messages/lesson-pages/de.json";
import es from "@/messages/lesson-pages/es.json";

interface LessonPagesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BandPagesPage({ params }: LessonPagesPageProps) {
  const { locale } =  await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleLessonPages}</h1>
    </main>
  );
}