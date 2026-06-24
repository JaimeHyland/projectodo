import Link from "next/link";

import en from "@/messages/bands/en.json";
import de from "@/messages/bands/de.json";
import es from "@/messages/bands/es.json";
import { serverApiFetch } from "@/lib/server-api";

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
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-center text-2xl font-bold">
        {messages.titleBands}
      </h1>

      {pages.length === 0 ? (
        <p className="text-center text-gray-600">
          No band webpages have been published yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {pages.map((page) => (
            <li
              key={page.id}
              className="rounded border bg-white p-4 shadow-sm"
            >
              <Link
                href={`/${locale}/bands/${page.slug}`}
                className="block hover:underline"
              >
                <h2 className="text-xl font-semibold">
                  {page.band.name}
                </h2>
              </Link>

              {page.band.genres.length > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  {page.band.genres.join(", ")}
                </p>
              )}

              {page.band.description && (
                <p className="mt-3 text-gray-700">
                  {page.band.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}