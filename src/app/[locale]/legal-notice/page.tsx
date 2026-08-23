import Link from "next/link";

import en from "@/messages/legal-notice/en.json";
import de from "@/messages/legal-notice/de.json";
import es from "@/messages/legal-notice/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";


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
    <PageShell title={messages.titleLegalNotice} accent="gray" maxWidth="4xl">
      {messages.legalNotice.sections.map((section: LegalNoticeSection) => (
        <ContentPanel key={section.heading} className="space-y-4 leading-7 text-[#514f4b]">
          <h2 className="text-xl font-bold text-[#292826]">{section.heading}</h2>

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
                className="font-medium underline underline-offset-4"
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {link.text}
              </Link>
            </p>
          ))}
        </ContentPanel>
      ))}
    </PageShell>
  );
}
