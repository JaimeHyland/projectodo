import Link from "next/link";

import en from "@/messages/privacy/en.json";
import de from "@/messages/privacy/de.json";
import es from "@/messages/privacy/es.json";

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
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-8">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{messages.titlePrivacy}</h1>
        <p className="text-sm text-gray-600">{messages.lastUpdated}</p>
      </header>

      <p>{messages.introduction}</p>

      {messages.sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.heading}</h2>

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
                className="underline"
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {link.label}
              </Link>
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
