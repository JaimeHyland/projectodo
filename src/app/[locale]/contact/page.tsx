import en from "@/messages/contact/en.json";
import de from "@/messages/contact/de.json";
import es from "@/messages/contact/es.json";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

import Link from "next/link";

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const contact = messages.contact;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-center">
        {messages.titleContact}
      </h1>

      <section className="space-y-2 text-center">
        <p className="font-semibold">{contact.name}</p>
        <p>{contact.person}</p>

        {contact.address.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section className="space-y-1 text-center">
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
          <Link href={`mailto:${contact.details.email}`} className="underline">
            {contact.details.email}
          </Link>
        </p>
        <p>
          {contact.details.websiteLabel}:{" "}
          <Link
            href={`https://${contact.details.website}`}
            className="underline"
            target="_blank"
          >
            {contact.details.website}
          </Link>
        </p>
      </section>
    </main>
  );
}
