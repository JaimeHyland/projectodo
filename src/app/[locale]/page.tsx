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

const SECTION_STYLES: Record<
  (typeof HOME_SECTION_IDS)[number],
  { surface: string; accent: string }
> = {
  lessons: {
    surface: "bg-[#e7eef0]",
    accent: "bg-[#6f8990]",
  },
  bands: {
    surface: "bg-[#ece8f1]",
    accent: "bg-[#8b7897]",
  },
};

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
    <main className="bg-[#f5f2eb] px-4 py-8 text-[#292826] sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
        <section className="grid overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_50px_rgba(55,49,40,0.10)] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <div className="relative min-h-64 sm:min-h-80 lg:min-h-[29rem]">
            <Image
              src="/guitarist.jpg"
              fill
              priority
              alt=""
              sizes="(min-width: 1024px) 53vw, 100vw"
              className="scale-110 object-cover opacity-55 blur-2xl"
            />
            <div className="absolute inset-0 bg-[#17202b]/60" />
            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-12">
              <Image
                src="/guitarist.jpg"
                alt={messages.home.intro.imageAlt}
                width={245}
                height={163}
                priority
                sizes="(min-width: 640px) 384px, 78vw"
                className="h-auto w-[78%] max-w-sm rounded-lg border border-white/25 shadow-2xl"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
            <div className="mb-6 h-1 w-16 rounded-full bg-[#c27a4a]" />
            <h1 className="text-3xl font-bold tracking-tight text-[#22211f] sm:text-4xl">
              {messages.titleHome}
            </h1>

            <div className="mt-6 space-y-4 text-base leading-7 text-[#595650] sm:text-lg">
              {messages.home.intro.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <p className="mt-7 border-l-4 border-[#c27a4a] pl-4 text-lg font-semibold italic leading-7 text-[#34312e]">
              {messages.home.intro.claim}
            </p>
          </div>
        </section>

        <section
          className="grid grid-cols-1 gap-5 md:[grid-template-columns:var(--home-columns)]"
          style={
            {
              "--home-columns": `repeat(${visibleSections.length}, minmax(0, 1fr))`,
            } as React.CSSProperties
          }
        >
          {visibleSections.map((section) => {
            const styles =
              SECTION_STYLES[
                section.id as (typeof HOME_SECTION_IDS)[number]
              ];

            return (
              <article
                key={section.id}
                className={`${styles.surface} relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-black/10 p-6 shadow-[0_8px_25px_rgba(55,49,40,0.06)] sm:p-8`}
              >
                <div
                  className={`${styles.accent} absolute inset-x-0 top-0 h-1.5`}
                />
                <h2 className="text-2xl font-bold tracking-tight text-[#282725]">
                  {section.title}
                </h2>

                <p className="mt-4 flex-1 leading-7 text-[#514f4b]">
                  {section.body}
                </p>

                <Link
                  href={`/${locale}${section.href}`}
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-black/20 bg-white/70 px-4 py-2 font-semibold text-[#292826] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#292826] focus-visible:ring-offset-2"
                >
                  {section.linkLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
