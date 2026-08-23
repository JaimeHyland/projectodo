import Link from "next/link";

import en from "@/messages/bands/en.json";
import de from "@/messages/bands/de.json";
import es from "@/messages/bands/es.json";
import { serverApiFetch } from "@/lib/server-api";
import { ContentPanel, PageShell } from "@/components/PageShell";

interface BandsPageProps {
  params: Promise<{ locale: string }>;
}

type PublicBandPageSummary = {
  id: number;
  slug: string;
  band: {
    id: number;
    name: string;
    description: string;
    genres: string[];
  };
};

async function getBandPages(): Promise<PublicBandPageSummary[]> {
  const response = await serverApiFetch("/api/bands/pages/");;

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return data.pages ?? [];
}

export default async function BandsPage({ params }: BandsPageProps) {
  const { locale } = await params;

  const messages = locale === "de" ? de : locale === "es" ? es : en;

  const pages = await getBandPages();

  return (
    <PageShell title={messages.titleBands} accent="green" maxWidth="5xl">
      {pages.length === 0 ? (
        <ContentPanel className="text-center text-[#68645e]">
          <p>{messages.noPublishedBands}</p>
        </ContentPanel>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {pages.map((page) => (
            <li
              key={page.id}
              className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#edf2e5] p-6 shadow-[0_8px_25px_rgba(55,49,40,0.06)] sm:p-7"
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[#789849]" />
              <Link
                href={`/${locale}/bands/${page.slug}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f6c2d] focus-visible:ring-offset-2"
              >
                <h2 className="text-2xl font-bold tracking-tight hover:underline">
                  {page.band.name}
                </h2>
              </Link>

              {page.band.genres.length > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  {page.band.genres.join(", ")}
                </p>
              )}

              {page.band.description && (
                <p className="mt-4 leading-7 text-[#514f4b]">
                  {page.band.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
