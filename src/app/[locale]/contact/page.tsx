import en from "@/messages/contact/en.json";
import de from "@/messages/contact/de.json";
import es from "@/messages/contact/es.json";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

import Link from "next/link";

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const contact = messages.contact;

  return (
    <PageShell title={messages.titleContact} accent="gold" maxWidth="4xl">
      <div className="grid gap-5 md:grid-cols-2">
      <ContentPanel className="space-y-2">
        <p className="font-semibold">{contact.name}</p>
        <p>{contact.person}</p>

        {contact.address.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </ContentPanel>

      <ContentPanel className="space-y-3">
        <p>
          {contact.details.phoneLabel}: {contact.details.phone}
        </p>
        <p>
          {contact.details.mobileLabel}: {contact.details.mobile}
        </p>
        <p>
          {contact.details.faxLabel}: {contact.details.fax}
        </p>
        <p>
          {contact.details.emailLabel}:{" "}
          <Link href={`mailto:${contact.details.email}`} className="font-medium underline underline-offset-4">
            {contact.details.email}
          </Link>
        </p>
        <p>
          {contact.details.websiteLabel}:{" "}
          <Link
            href={`https://${contact.details.website}`}
            className="font-medium underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            {contact.details.website}
          </Link>
        </p>
      </ContentPanel>
      </div>
    </PageShell>
  );
}
