"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Cookies from "js-cookie";
import { apiUrl } from "@/lib/api";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { localizedText } from "@/lib/localized-content";
import BandGigEditor from "./BandGigEditor";
import en from "@/messages/band-pages/en.json";
import de from "@/messages/band-pages/de.json";
import es from "@/messages/band-pages/es.json";

type BandPageData = {
  id: number; slug: string; description_html: string; background_colour: string; published: boolean;
  description_translations?: Record<string, string>;
  main_image?: string | null; image_caption?: Record<string, string>; image_alt?: Record<string, string>;
  audio_url?: string; video_url?: string; video_captions_url?: string;
  band: { id: number; name: string; description?: string; description_translations?: Record<string, string> };
};

export default function BandWebpageBuilder({ locale, bandId, page }: {
  locale: string; bandId: string; page: BandPageData | null;
}) {
  const m = (locale === "de" ? de : locale === "es" ? es : en).editor;
  const router = useRouter();
  const [saved, setSaved] = useState(page);
  const [descriptions, setDescriptions] = useState(page?.description_translations ?? {});
  const [bandDescriptions, setBandDescriptions] = useState(page?.band.description_translations ?? {});
  const [background, setBackground] = useState(page?.background_colour ?? "#ffffff");
  const [language, setLanguage] = useState(locale);
  const [captions, setCaptions] = useState(page?.image_caption ?? {});
  const [alternatives, setAlternatives] = useState(page?.image_alt ?? {});
  const [audio, setAudio] = useState(page?.audio_url ?? "");
  const [video, setVideo] = useState(page?.video_url ?? "");
  const [videoCaptions, setVideoCaptions] = useState(page?.video_captions_url ?? "");
  const [published, setPublished] = useState(page?.published ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputClass = "w-full rounded-md border border-black/20 bg-white p-2";

  async function savePage() {
    setBusy(true); setError(false); setSuccess(false);
    try {
      const response = await fetch(apiUrl(`bands/admin/bands/${bandId}/page/${saved ? "" : "create/"}`), {
        method: saved ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": Cookies.get("csrftoken") ?? "" },
        body: JSON.stringify({ description_translations: descriptions,
          band_description_translations: bandDescriptions, background_colour: background,
          image_caption: captions, image_alt: alternatives, audio_url: audio,
          video_url: video, video_captions_url: videoCaptions, published }),
      });
      if (!response.ok) throw new Error("save");
      setSaved(await response.json()); setSuccess(true); router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  async function uploadImage(file: File) {
    setBusy(true); setError(false); setSuccess(false);
    try {
      const body = new FormData(); body.set("image", file);
      const response = await fetch(apiUrl(`bands/admin/bands/${bandId}/page/image/`), {
        method: "POST", credentials: "include", body,
        headers: { "X-CSRFToken": Cookies.get("csrftoken") ?? "" },
      });
      if (!response.ok) throw new Error("upload");
      const result = await response.json();
      setSaved(previous => previous ? { ...previous, main_image: result.main_image } : previous);
      setSuccess(true); router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">{saved ? m.edit : m.create}</h1>
    {saved?.band.name && <p>{saved.band.name}</p>}
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void savePage(); }}>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
        <div><label htmlFor="band-caption-language" className="mr-3">{m.language}</label>
          <select id="band-caption-language" className="rounded border p-2" value={language} onChange={event => setLanguage(event.target.value)}>
            {SUPPORTED_LOCALES.map(code => <option key={code} value={code}>{code.toUpperCase()}</option>)}
          </select>
        </div>
        <p className="text-sm text-gray-600">{m.translationHelp}</p>
        <div><label htmlFor="band-summary" className="mb-1 block font-medium">{m.bandDescription}</label>
          <textarea id="band-summary" rows={4} maxLength={20000} className={inputClass}
            value={localizedText(bandDescriptions, language, saved?.band.description ?? "")}
            onChange={event => setBandDescriptions({ ...bandDescriptions, [language]: event.target.value })} />
        </div>
        <div><label htmlFor="band-description" className="mb-1 block font-medium">{m.description}</label>
          <textarea id="band-description" rows={8} maxLength={20000} className={inputClass}
            value={localizedText(descriptions, language, saved?.description_html ?? "")}
            onChange={event => setDescriptions({ ...descriptions, [language]: event.target.value })} />
        </div>
        <div><label htmlFor="band-background" className="mr-3 font-medium">{m.background}</label>
          <input id="band-background" type="color" value={background} onChange={event => setBackground(event.target.value)} />
        </div>
        <section className="space-y-3 border-t border-black/10 pt-4" aria-label={m.photo}>
          <h2 className="font-semibold">{m.photo}</h2>
          {saved?.main_image && <Image src={saved.main_image} alt={m.currentPhoto} width={360} height={240}
            unoptimized className="h-auto max-h-60 w-auto max-w-full" />}
          <label htmlFor="band-image" className="block">{m.upload}</label>
          <input id="band-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={!saved}
            onChange={event => {
              const file = event.target.files?.[0]; event.target.value = "";
              if (file) { if (file.size > 5 * 1024 * 1024) setError(true); else void uploadImage(file); }
            }} />
          <p className="text-sm text-gray-600">{saved ? m.imageHelp : m.saveFirst}</p>
          <div><label htmlFor="band-caption" className="mb-1 block">{m.caption}</label>
            <input id="band-caption" className={inputClass} maxLength={500} value={captions[language] ?? ""} onChange={event => setCaptions({ ...captions, [language]: event.target.value })} />
          </div>
          <div><label htmlFor="band-alt" className="mb-1 block">{m.alt}</label>
            <input id="band-alt" className={inputClass} maxLength={500} value={alternatives[language] ?? ""} onChange={event => setAlternatives({ ...alternatives, [language]: event.target.value })} />
          </div>
        </section>
        <section className="space-y-3 border-t border-black/10 pt-4" aria-label={m.media}>
          <h2 className="font-semibold">{m.media}</h2>
          {([["band-audio", m.audio, audio, setAudio], ["band-video", m.video, video, setVideo],
            ["band-video-captions", m.videoCaptions, videoCaptions, setVideoCaptions]] as const).map(([id, label, value, setter]) =>
              <div key={id}><label htmlFor={id} className="mb-1 block">{label}</label>
                <input id={id} type="url" maxLength={1000} className={inputClass} value={value}
                  onChange={event => setter(event.target.value)} />
              </div>)}
          <p className="text-sm text-gray-600">{m.mediaHelp}</p>
        </section>
        <label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} />{m.published}</label>
        <div className="flex gap-3">
          <button type="submit" className="rounded bg-[#3a5c03] px-4 py-2 text-white">{busy ? m.saving : m.save}</button>
          <button type="button" onClick={() => router.push(`/${locale}/admin-dashboard/`)} className="rounded bg-gray-200 px-4 py-2">{m.cancel}</button>
          {saved?.published && <a href={`/${locale}/bands/${saved.slug}/`} className="self-center underline">{m.viewPage}</a>}
        </div>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-red-700">{m.error}</p>}
    {success && <p role="status" className="text-green-800">{m.saved}</p>}
    <BandGigEditor bandId={bandId} locale={locale} />
  </div>;
}
