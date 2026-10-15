import { PublicCourseLessons } from "@/components/PublicCourseLessons";
import en from "@/messages/lessons/en.json";
import de from "@/messages/lessons/de.json";
import es from "@/messages/lessons/es.json";

export default async function CourseLessonsPage({ params, searchParams }: {
  params: Promise<{ locale: string; courseId: string }>;
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const { locale, courseId } = await params;
  const { location } = await searchParams;
  const messages = locale === "de" ? de : locale === "es" ? es : en;
  return <PublicCourseLessons key={`${locale}:${courseId}`} locale={locale} courseId={courseId}
    labels={messages.courseLessons} courseLabels={messages.courses}
    location={typeof location === "string" && /^[1-9][0-9]{0,9}$/.test(location) ? location : undefined} />;
}
