"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { localizedText } from "@/lib/localized-content";

export type UpcomingGig = {
  id: number; venue: string; city: string; starts_at: string;
  venue_translations?: Record<string, string>;
  ticket_prices: { id: number; description: string; description_translations?: Record<string, string>; price: string }[];
};

function currentTimestamp() {
  return Date.now();
}

export function BandPhotograph({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <figure className="mt-6">
    <Image src={src} alt={alt} width={1200} height={800} unoptimized
      className="h-auto w-full rounded-lg" onError={() => setFailed(true)} />
    {caption.trim() && <figcaption className="mt-2 text-sm">{caption}</figcaption>}
  </figure>;
}

export function UpcomingBandGigs({ gigs, initialTime, locale, title }: {
  gigs: UpcomingGig[]; initialTime: string; locale: string; title: string;
}) {
  const [now, setNow] = useState(() => Date.parse(initialTime));
  const upcoming = gigs.filter(gig => Date.parse(gig.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const nextStart = upcoming[0]?.starts_at;
  useEffect(() => {
    if (!nextStart) return;
    const delay = Math.max(0, Math.min(Date.parse(nextStart) - currentTimestamp(), 2147483647));
    const timer = window.setTimeout(() => setNow(currentTimestamp()), delay);
    return () => window.clearTimeout(timer);
  }, [nextStart, now]);
  if (!upcoming.length) return null;
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Berlin" });
  const times = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const euros = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  return <section className="mt-8" aria-label={title}>
    <h2 className="text-xl font-semibold">{title}</h2>
    <ul className="mt-3 space-y-5">
      {upcoming.map(gig => <li key={gig.id}>
        <h3 className="font-semibold">{localizedText(gig.venue_translations, locale, gig.venue)}{gig.city ? `, ${gig.city}` : ""}</h3>
        <time dateTime={gig.starts_at}>{dates.format(new Date(gig.starts_at))} · {times.format(new Date(gig.starts_at))}</time>
        <dl className="mt-1 space-y-1">
          {gig.ticket_prices.map(price => <div key={price.id} className="flex flex-wrap gap-x-3">
            <dt>{localizedText(price.description_translations, locale, price.description)}</dt><dd>{euros.format(Number(price.price))}</dd>
          </div>)}
        </dl>
      </li>)}
    </ul>
  </section>;
}

export function BandMedia({ audio, video, captions, messages: m }: {
  audio: string; video: string; captions: string;
  messages: { media: string; audioExcerpt: string; videoExcerpt: string; captionTrack: string; mediaUnavailable: string };
}) {
  const [audioFailed, setAudioFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  if (!audio && !video) return null;
  return <section className="mt-8 space-y-3" aria-label={m.media}>
    <h2 className="text-xl font-semibold">{m.media}</h2>
    {audio && (audioFailed ? <p>{m.mediaUnavailable}</p> : <audio
      src={audio} controls preload="none" aria-label={m.audioExcerpt}
      className="w-full" onError={() => setAudioFailed(true)} />)}
    {video && (videoFailed ? <p>{m.mediaUnavailable}</p> : <video
      src={video} controls playsInline preload="none" aria-label={m.videoExcerpt}
      crossOrigin={captions ? "anonymous" : undefined}
      className="h-auto w-full" onError={() => setVideoFailed(true)}>
      {captions && <track kind="captions" src={captions} label={m.captionTrack} default />}
    </video>)}
  </section>;
}
