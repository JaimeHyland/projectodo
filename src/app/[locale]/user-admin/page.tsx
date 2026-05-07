import en from "@/messages/user-admin/en.json";
import de from "@/messages/user-admin/de.json";
import es from "@/messages/user-admin/es.json";

interface UserAdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function UserAdminPage({ params }: UserAdminPageProps) {
  const { locale } =  await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleUserAdmin}</h1>
    </main>
  );
}