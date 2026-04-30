import Image from "next/image";

import en from "@/messages/production/en.json";
import de from "@/messages/production/de.json";
import es from "@/messages/production/es.json";

interface ProductionPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProductionPage({ params }: ProductionPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const production = messages.production;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-center text-2xl font-bold">
        {messages.titleProduction}
      </h1>

      <section className="space-y-4">
        <Image
          src="/produktion.jpg"
          alt={production.image.alt}
          width={360}
          height={240}
          className="mb-4 rounded-md md:float-left md:mr-6"
        />

        {production.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <p className="font-semibold">{production.highlight}</p>
      </section>
    </main>
  );
}