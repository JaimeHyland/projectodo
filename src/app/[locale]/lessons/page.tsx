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
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold text-center">
        {messages.titleLessons}
      </h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{lessons.headline}</h2>

        {lessons.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        {lessons.benefits.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      <section className="space-y-4">
        <p className="font-semibold">{lessons.contact.label}</p>

        {lessons.contact.locations.map((loc) => (
          <div key={loc.title}>
            <h4 className="font-semibold">{loc.title}</h4>
            {loc.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}

        <div className="space-y-1">
          <p>{lessons.contact.details.phone}</p>
          <p>{lessons.contact.details.mobile}</p>
          <p>{lessons.contact.details.fax}</p>
          <p>{lessons.contact.details.email}</p>
          <p>{lessons.contact.details.website}</p>
        </div>
      </section>
    </main>
  );
}
