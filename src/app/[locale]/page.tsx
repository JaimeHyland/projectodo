import Image from "next/image";
import Link from "next/link";

import en from "@/messages/en.json";
import de from "@/messages/de.json";
import es from "@/messages/es.json";

const messagesByLocale = {
  en,
  de,
  es,
} as const;

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const HOME_SECTION_IDS = ["lessons", "bands"] as const;

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  const messages =
    messagesByLocale[locale as keyof typeof messagesByLocale] ??
    messagesByLocale.en;


  const visibleSections = messages.home.sections.filter((section) =>
    HOME_SECTION_IDS.includes(
      section.id as (typeof HOME_SECTION_IDS)[number]
    )
  );

  
  return (
    <main className="p-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex justify-center md:block shrink-0">
          <Image
            src="/guitarist.jpg"
            alt={messages.home.intro.imageAlt}
            width={360}
            height={240}
            className="rounded-md"
          />
        </div>

        <section
          className="grid grid-cols-1 gap-6 flex-1 md:[grid-template-columns:var(--home-columns)]"
          style={
            {
              "--home-columns": `repeat(${visibleSections.length}, minmax(0, 1fr))`,
            } as React.CSSProperties
          }
        >
          {visibleSections.map((section) => (
            <article key={section.id} className="space-y-3">
              <h2 className="text-xl font-semibold">
                {section.title}
              </h2>

              <p>{section.body}</p>

              <Link
                href={`/${locale}${section.href}`}
                className="font-medium underline"
              >
                {section.linkLabel}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
