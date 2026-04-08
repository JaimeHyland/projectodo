import en from "@/messages/en.json";
import de from "@/messages/de.json";
import es from "@/messages/es.json";

import SetPasswordEntry from "@/components/auth/SetPasswordEntry";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <>
      <SetPasswordEntry locale={locale} messages={messages} />
      <main className="p-8 text-center">
        <h1 className="text-2xl font-bold">{messages.titleHome}</h1>
      </main>
    </>

  );
}
