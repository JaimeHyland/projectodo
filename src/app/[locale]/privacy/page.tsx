import Link from "next/link";

import en from "@/messages/privacy/en.json";
import de from "@/messages/privacy/de.json";
import es from "@/messages/privacy/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface PrivacySection {
  heading: string;
  paragraphs: string[];
  items?: string[];
  links?: Array<{ label: string; href: string }>;
}

interface PrivacyMessages {
  titlePrivacy: string;
  lastUpdated: string;
  introduction: string;
  sections: PrivacySection[];
}

const messagesByLocale: Record<string, PrivacyMessages> = { en, de, es };

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const messages = messagesByLocale[locale] ?? messagesByLocale.en;

  return (
    <PageShell
      title={messages.titlePrivacy}
      accent="gray"
      maxWidth="4xl"
      meta={messages.lastUpdated}
    >
      <ContentPanel className="border-l-4 border-l-[#8b8b85] leading-7 text-[#514f4b]">
        <p>{messages.introduction}</p>
      </ContentPanel>

      {messages.sections.map((section) => (
        <ContentPanel key={section.heading} className="space-y-3 leading-7 text-[#514f4b]">
          <h2 className="text-xl font-bold text-[#292826]">{section.heading}</h2>

          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          {section.items && (
            <ul className="list-disc space-y-2 pl-6">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {section.links?.map((link) => (
            <p key={link.href}>
              <Link
                href={link.href}
                className="font-medium underline underline-offset-4"
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {link.label}
              </Link>
            </p>
          ))}
        </ContentPanel>
      ))}
    </PageShell>
  );
}
