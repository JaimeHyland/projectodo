import Image from "next/image";

import en from "@/messages/technical/en.json";
import de from "@/messages/technical/de.json";
import es from "@/messages/technical/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface TechnicalPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TechnicalPage({ params }: TechnicalPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const technical = messages.technical;

  return (
    <PageShell title={messages.titleTechnical} accent="blue" maxWidth="5xl">
      <ContentPanel className="flow-root space-y-4 text-[#514f4b]">
        <Image
          src="/technik.jpg"
          alt={technical.image.alt}
          width={360}
          height={240}
          className="mb-6 h-auto w-full rounded-xl shadow-md sm:max-w-sm md:float-left md:mr-8"
        />

        {technical.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </ContentPanel>
    </PageShell>
  );
}
