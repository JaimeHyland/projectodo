import Link from "next/link";

import en from "@/messages/legal-notice/en.json";
import de from "@/messages/legal-notice/de.json";
import es from "@/messages/legal-notice/es.json";


interface LegalNoticePageProps {
  params: Promise<{ locale: string }>;
}

interface LegalNoticeSection {
  heading: string;
  paragraphs: string[][];
  links?: LegalNoticeLink[];
}

interface LegalNoticeLink {
  label: string;
  text: string;
  href: string;
}

interface LegalNoticeMessages {
  titleLegalNotice: string;
  legalNotice: {
    sections: LegalNoticeSection[];
  };
}

const messagesByLocale: Record<string, LegalNoticeMessages> = {
  en,
  de,
  es
};

export default async function LegalNoticePage({
  params,
}: LegalNoticePageProps) {
  const { locale } = await params;
  const messages = messagesByLocale[locale] ?? messagesByLocale.en;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-center text-2xl font-bold">
        {messages.titleLegalNotice}
      </h1>

      {messages.legalNotice.sections.map((section: LegalNoticeSection) => (
        <section key={section.heading} className="space-y-4">
          <h2 className="text-xl font-semibold">{section.heading}</h2>

          {section.paragraphs.map((paragraph: string[], index: number) => (
            <p key={index}>
              {paragraph.map((line: string) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          ))}

          {section.links?.map((link:LegalNoticeLink) => (
            <p key={link.href}>
              {link.label}:{" "}
              <Link
                href={link.href}
                className="underline"
                target={link.href.startsWith("http") ? "_blank" : undefined}
              >
                {link.text}
              </Link>
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}