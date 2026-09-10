import { LessonCourseLinks } from "@/components/LessonCourseLinks";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ContentPanel, PageShell } from "@/components/PageShell";

import en from "@/messages/lessons/en.json";
import de from "@/messages/lessons/de.json";
import es from "@/messages/lessons/es.json";

interface LessonsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LessonsPage({ params }: LessonsPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const lessons = messages.lessons;

  return (
    <PageShell title={messages.titleLessons} accent="gold" maxWidth="5xl">
      <ContentPanel className="space-y-4 leading-7 text-[#514f4b]">
        <h2 className="text-2xl font-bold tracking-tight text-[#292826]">
          {lessons.headline}
        </h2>

        {lessons.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        {lessons.benefits.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </ContentPanel>

      <CollapsibleSection title={lessons.locationsTitle} defaultOpen variant="soft">
        <LessonCourseLinks locale={locale} labels={messages.courses} locationError={lessons.couldNotLoadLocations} />
      </CollapsibleSection>

      <ContentPanel className="space-y-4 border-l-4 border-l-[#d5a300]">
        <p className="font-semibold">{lessons.contact.label}</p>

        <div className="space-y-1">
          <p>{lessons.contact.details.phone}</p>
          <p>{lessons.contact.details.mobile}</p>
          <p>{lessons.contact.details.fax}</p>
          <p>{lessons.contact.details.email}</p>
          <p>{lessons.contact.details.website}</p>
        </div>
      </ContentPanel>
    </PageShell>
  );
}
