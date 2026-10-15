import { PublicCoursesList } from "@/components/PublicCoursesList";
import en from "@/messages/lessons/en.json";
import de from "@/messages/lessons/de.json";
import es from "@/messages/lessons/es.json";

export default async function CoursesPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const { locale } = await params;
  const { location } = await searchParams;
  const labels = (locale === "de" ? de : locale === "es" ? es : en).courses;
  const filter = Array.isArray(location) ? "invalid" : location;
  return <PublicCoursesList key={`${locale}:${filter}`} locale={locale} labels={labels} location={filter} />;
}
