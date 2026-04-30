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

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  const messages =
    messagesByLocale[locale as keyof typeof messagesByLocale] ??
    messagesByLocale.en;

  const home = messages;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-8 text-center text-2xl font-bold">
        {messages.titleHome}
      </h1>

      <section className="space-y-4">
        <Image
          src="/guitarist.jpg"
          alt={messages.home.intro.imageAlt}
          width={360}
          height={240}
          className="mb-4 rounded-md md:float-left md:mr-6"
        />

        {messages.home.intro.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        <p>
          <strong>{messages.home.intro.claim}</strong>
        </p>
      </section>

      <hr className="my-8" />

      <section className="grid gap-6 md:grid-cols-3">
        {messages.home.sections.map((section) => (
          <article key={section.href} className="space-y-3">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p>{section.body}</p>
            <p>
              <Link
                href={`/${locale}${section.href}`}
                className="font-medium underline"
              >
                {section.linkLabel}
              </Link>
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
