import Image from "next/image";

import en from "@/messages/technical/en.json";
import de from "@/messages/technical/de.json";
import es from "@/messages/technical/es.json";

interface TechnicalPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TechnicalPage({ params }: TechnicalPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const technical = messages.technical;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-center text-2xl font-bold">
        {messages.titleTechnical}
      </h1>

      <section className="space-y-4">
        <Image
          src="/technik.jpg"
          alt={technical.image.alt}
          width={360}
          height={240}
          className="mb-4 rounded-md md:float-left md:mr-6"
        />

        {technical.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
    </main>
  );
}
