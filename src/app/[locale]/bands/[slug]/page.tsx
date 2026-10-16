import { notFound } from "next/navigation";

import { serverApiFetch } from "@/lib/server-api";
import { localizedText } from "@/lib/localized-content";
import { BandMedia, BandPhotograph, UpcomingBandGigs, type UpcomingGig } from "@/components/BandPageExtras";
import en from "@/messages/bands/en.json";
import de from "@/messages/bands/de.json";
import es from "@/messages/bands/es.json";

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
  description_translations?: Record<string, string>;
  foreground_colour: string;
  background_colour: string;
  published: boolean;
  main_image?: string | null;
  image_caption?: Record<string, string>;
  image_alt?: Record<string, string>;
  audio_url?: string;
  video_url?: string;
  video_captions_url?: string;
  upcoming_gigs?: UpcomingGig[];
  server_time?: string;
  band: {
    id: number;
    name: string;
    description: string;
    description_translations?: Record<string, string>;
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
  const { slug, locale } = await params;
  const m = (locale === "de" ? de : locale === "es" ? es : en).details;

  const page = await getBandPage(slug);
  const description = localizedText(page.description_translations, locale, page.description_html);

  return (
    <div
      className="min-h-full px-4 py-8 sm:px-6 sm:py-10"
      style={{
        color: page.foreground_colour,
        backgroundColor: page.background_colour,
      }}
    >
      <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">{page.band.name}</h1>

      {page.band.genres.length > 0 && (
        <p className="mt-2 text-sm">
          {page.band.genres.join(", ")}
        </p>
      )}

      {page.main_image && <BandPhotograph key={page.main_image} src={page.main_image}
        caption={page.image_caption?.[locale] ?? ""}
        alt={page.image_alt?.[locale]?.trim() || m.photoAlt.replace("{band}", page.band.name)} />}

      {description && (
        <section className="mt-8">
          <p className="whitespace-pre-line leading-7">
            {description}
          </p>
        </section>
      )}

      {page.band.members.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            {m.members}
          </h2>

          <ul className="mt-3 list-disc space-y-2 pl-6">
            {page.band.members.map((member) => (
              <li key={member.id}>
                <span className="font-medium">{member.name}</span>
                {member.roles.length > 0 && (
                  <span>
                    {" "}
                    — {member.roles.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <UpcomingBandGigs gigs={page.upcoming_gigs ?? []} initialTime={page.server_time ?? new Date().toISOString()}
        locale={locale} title={m.upcomingGigs} />
      <BandMedia key={`${page.audio_url}:${page.video_url}`} audio={page.audio_url ?? ""}
        video={page.video_url ?? ""} captions={page.video_captions_url ?? ""} messages={m} />

      {(page.band.contact_email ||
        page.band.contact_tel ||
        page.band.website_url) && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            {m.contact}
          </h2>

          <div className="mt-3 space-y-1 leading-7">
            {page.band.contact_email && (
              <p>
                {m.email}:{" "}
                <a
                  href={`mailto:${page.band.contact_email}`}
                  className="underline underline-offset-2"
                >
                  {page.band.contact_email}
                </a>
              </p>
            )}

            {page.band.contact_tel && (
              <p>{m.phone}: {page.band.contact_tel}</p>
            )}

            {page.band.website_url && (
              <p>
                {m.website}:{" "}
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
    </div>
  );
}
