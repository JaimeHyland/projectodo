import { getPageContent } from "@/lib/page-content";
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
  const fallback = locale === "de" ? de : locale === "es" ? es : en;
  const messages = await getPageContent("technical", locale, {
    ...fallback, technical: { ...fallback.technical, image: { ...fallback.technical.image, src: "/technik.jpg" } },
  });

  const technical = messages.technical;

  return (
    <PageShell title={messages.titleTechnical} accent="blue" maxWidth="5xl">
      <ContentPanel className="flow-root space-y-4 text-[#514f4b]">
        {technical.image.src && <Image
          src={technical.image.src}
          unoptimized={technical.image.src !== "/technik.jpg"}
          alt={technical.image.alt}
          width={360}
          height={240}
          style={{ aspectRatio: "245 / 160" }}
          className="object-cover mb-6 h-auto w-full rounded-xl shadow-md sm:max-w-sm md:float-left md:mr-8"
        />}

        {technical.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </ContentPanel>
    </PageShell>
  );
}
