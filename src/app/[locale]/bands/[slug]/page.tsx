import { notFound } from "next/navigation";

import { serverApiFetch } from "@/lib/server-api";

type BandPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

type PublicBandPage = {
  id: number;
  slug: string;
  description_html: string;
  foreground_colour: string;
  background_colour: string;
  published: boolean;
  band: {
    id: number;
    name: string;
    description: string;
    contact_email: string;
    contact_tel: string;
    website_url: string;
    social_media_urls: { platform: string; url: string }[];
    genres: string[];
    band_leader: {
      id: number;
      username: string;
      email: string;
    } | null;
    members: {
      id: number;
      name: string;
      roles: string[];
      sort_order: number;
      user_id: number | null;
    }[];
  };
};

async function getBandPage(slug: string): Promise<PublicBandPage> {
  const response = await serverApiFetch(`/api/bands/pages/${slug}/`);

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    notFound();
  }

  const page: PublicBandPage = await response.json();

  if (!page.published) {
    notFound();
  }

  return page;
}

export default async function PublicBandPage({ params }: BandPageProps) {
  const { slug } = await params;

  const page = await getBandPage(slug);

  return (
    <main
      className="min-h-full px-4 py-8 sm:px-6 sm:py-10"
      style={{
        color: page.foreground_colour,
        backgroundColor: page.background_colour,
      }}
    >
      <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">{page.band.name}</h1>

      {page.band.genres.length > 0 && (
        <p className="mt-2 text-sm opacity-75">
          {page.band.genres.join(", ")}
        </p>
      )}

      {page.description_html && (
        <section className="mt-8">
          <p className="whitespace-pre-line leading-7">
            {page.description_html}
          </p>
        </section>
      )}

      {page.band.members.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Members
          </h2>

          <ul className="mt-3 list-disc space-y-2 pl-6">
            {page.band.members.map((member) => (
              <li key={member.id}>
                <span className="font-medium">{member.name}</span>
                {member.roles.length > 0 && (
                  <span className="opacity-80">
                    {" "}
                    — {member.roles.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(page.band.contact_email ||
        page.band.contact_tel ||
        page.band.website_url) && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            Contact
          </h2>

          <div className="mt-3 space-y-1 leading-7">
            {page.band.contact_email && (
              <p>
                Email:{" "}
                <a
                  href={`mailto:${page.band.contact_email}`}
                  className="underline underline-offset-2"
                >
                  {page.band.contact_email}
                </a>
              </p>
            )}

            {page.band.contact_tel && (
              <p>Tel: {page.band.contact_tel}</p>
            )}

            {page.band.website_url && (
              <p>
                Website:{" "}
                <a
                  href={page.band.website_url}
                  className="underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  {page.band.website_url}
                </a>
              </p>
            )}
          </div>
        </section>
      )}
      </article>
    </main>
  );
}
