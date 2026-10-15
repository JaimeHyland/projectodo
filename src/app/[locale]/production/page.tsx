import { getPageContent } from "@/lib/page-content";
import Image from "next/image";

import en from "@/messages/production/en.json";
import de from "@/messages/production/de.json";
import es from "@/messages/production/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface ProductionPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProductionPage({ params }: ProductionPageProps) {
  const { locale } = await params;
  const fallback = locale === "de" ? de : locale === "es" ? es : en;
  const messages = await getPageContent("production", locale, {
    ...fallback, production: { ...fallback.production, image: { ...fallback.production.image, src: "/produktion.jpg" } },
  });

  const production = messages.production;

  return (
    <PageShell title={messages.titleProduction} accent="purple" maxWidth="5xl">
      <ContentPanel className="flow-root space-y-4 text-[#514f4b]">
        {production.image.src && <Image
          src={production.image.src}
          unoptimized={production.image.src !== "/produktion.jpg"}
          alt={production.image.alt}
          width={360}
          height={240}
          style={{ aspectRatio: "245 / 147" }}
          className="object-cover mb-6 h-auto w-full rounded-xl shadow-md sm:max-w-sm md:float-left md:mr-8"
        />}

        {production.paragraphs.map((p, index) => (
          <p key={index}>{p}</p>
        ))}

        <p className="font-semibold text-[#292826]">{production.highlight}</p>
      </ContentPanel>
    </PageShell>
  );
}
