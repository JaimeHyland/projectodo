import en from "@/messages/admin-dashboard/en.json";
import de from "@/messages/admin-dashboard/de.json";
import es from "@/messages/admin-dashboard/es.json";

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { locale } =  await params;
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold">{messages.titleAdminDashboard}</h1>
      <p className="text-lg">{messages.descriptionAdminDashboard}</p> 
    </main>
  );
}