"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { apiUrl } from "@/lib/api";
import { localizedText } from "@/lib/localized-content";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import en from "@/messages/band-pages/en.json";
import de from "@/messages/band-pages/de.json";
import es from "@/messages/band-pages/es.json";

type Ticket = { id?: number; description: string; description_translations: Record<string, string>; price: string };
type Gig = {
  id?: number; date: string; start_time: string; venue: string; venue_translations: Record<string, string>;
  city: string; ticket_prices: Ticket[];
};
const emptyTicket = (): Ticket => ({ description: "", description_translations: {}, price: "" });

export default function BandGigEditor({ bandId, locale }: { bandId: string; locale: string }) {
  const m = (locale === "de" ? de : locale === "es" ? es : en).gigEditor;
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [draft, setDraft] = useState<Gig | null>(null);
  const [language, setLanguage] = useState(locale);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [deleting, setDeleting] = useState<number | null>(null);
  const base = `bands/admin/bands/${bandId}/gigs/`;
  const inputClass = "w-full rounded border border-black/20 bg-white p-2";

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl(base), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("load");
        const data = await response.json();
        setGigs(data.gigs); setLoaded(true); setError(false);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [base, attempt]);

  function edit(gig: Gig) {
    setDraft({ ...gig, venue_translations: { ...gig.venue_translations },
      ticket_prices: gig.ticket_prices.length ? gig.ticket_prices.map(price => ({ ...price,
        description_translations: { ...price.description_translations } })) : [emptyTicket()] });
    setSaved(false); setError(false); setDeleting(null);
  }

  function changePrice(index: number, changes: Partial<Ticket>) {
    if (!draft) return;
    setDraft({ ...draft, ticket_prices: draft.ticket_prices.map((price, row) => row === index ? { ...price, ...changes } : price) });
    setSaved(false);
  }

  async function saveGig() {
    if (!draft) return;
    setBusy(true); setError(false); setSaved(false);
    try {
      const response = await fetch(apiUrl(`${base}${draft.id ? `${draft.id}/` : ""}`), {
        method: draft.id ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": Cookies.get("csrftoken") ?? "" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error("save");
      const result: Gig = await response.json();
      setGigs(previous => [...previous.filter(gig => gig.id !== result.id), result]
        .sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`)));
      setDraft(null); setSaved(true);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  async function deleteGig() {
    if (!deleting) return;
    setBusy(true); setError(false); setSaved(false);
    try {
      const response = await fetch(apiUrl(`${base}${deleting}/`), {
        method: "DELETE", credentials: "include", headers: { "X-CSRFToken": Cookies.get("csrftoken") ?? "" },
      });
      if (!response.ok) throw new Error("delete");
      setGigs(previous => previous.filter(gig => gig.id !== deleting)); setDeleting(null); setSaved(true);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3 border-t border-black/10 pt-4" aria-label={m.title}>
    <h2 className="text-lg font-semibold">{m.title}</h2>
    <p className="text-sm text-gray-600">{m.help}</p>
    {!loaded && !error && <p role="status">{m.loading}</p>}
    {error && <p role="alert" className="text-red-700">{m.error} {!loaded && <button type="button" className="underline" onClick={() => setAttempt(attempt + 1)}>{m.retry}</button>}</p>}
    {saved && <p role="status" className="text-green-800">{m.saved}</p>}
    {loaded && <>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="gig-language">{m.language}</label>
        <select id="gig-language" className="rounded border p-2" value={language} disabled={busy} onChange={event => setLanguage(event.target.value)}>
          {SUPPORTED_LOCALES.map(code => <option key={code} value={code}>{code.toUpperCase()}</option>)}
        </select>
        {!draft && <button type="button" disabled={busy} className="rounded border px-3 py-2" onClick={() => edit({ date: "", start_time: "", venue: "", venue_translations: {}, city: "", ticket_prices: [emptyTicket()] })}>{m.addGig}</button>}
      </div>
      {!draft && <>
        {!gigs.length && <p>{m.empty}</p>}
        <ul className="divide-y divide-black/10">
          {gigs.map(gig => <li key={gig.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span>{localizedText(gig.venue_translations, language, gig.venue)} — {gig.date} {gig.start_time}</span>
            <div className="flex gap-3">
              <button type="button" disabled={busy} className="underline" onClick={() => edit(gig)}>{m.edit}</button>
              <button type="button" disabled={busy} className="text-red-700 underline" onClick={() => { setDeleting(gig.id!); setSaved(false); }}>{m.delete}</button>
            </div>
          </li>)}
        </ul>
      </>}
      {deleting && <div className="space-y-2 rounded border border-red-200 p-3">
        <p>{m.confirmDelete}</p>
        <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={() => deleteGig()} className="text-red-700 underline">{m.confirm}</button>
          <button type="button" disabled={busy} onClick={() => setDeleting(null)} className="underline">{m.cancel}</button>
        </div>
      </div>}
      {draft && <form onSubmit={event => { event.preventDefault(); void saveGig(); }}>
        <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
          <p className="text-sm text-gray-600">{m.fallback}</p>
          <div><label htmlFor="gig-venue" className="mb-1 block">{m.venue}</label>
            <input id="gig-venue" className={inputClass} required maxLength={200}
              value={localizedText(draft.venue_translations, language, draft.venue)}
              onChange={event => setDraft({ ...draft, venue_translations: { ...draft.venue_translations, [language]: event.target.value } })} />
          </div>
          <div><label htmlFor="gig-city" className="mb-1 block">{m.city}</label>
            <input id="gig-city" className={inputClass} required maxLength={100} value={draft.city} onChange={event => setDraft({ ...draft, city: event.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="gig-date" className="mb-1 block">{m.date}</label><input id="gig-date" type="date" required className={inputClass} value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></div>
            <div><label htmlFor="gig-time" className="mb-1 block">{m.time}</label><input id="gig-time" type="time" required className={inputClass} value={draft.start_time} onChange={event => setDraft({ ...draft, start_time: event.target.value })} /></div>
          </div>
          <h3 className="font-semibold">{m.ticketPrices}</h3>
          {draft.ticket_prices.map((price, index) => <fieldset key={price.id ?? `new-${index}`} className="space-y-2 border-t border-black/10 pt-2">
            <legend className="text-sm">{m.ticketPrice} {index + 1}</legend>
            <div><label htmlFor={`ticket-description-${index}`} className="mb-1 block">{m.description}</label>
              <input id={`ticket-description-${index}`} required maxLength={100} className={inputClass}
                value={localizedText(price.description_translations, language, price.description)}
                onChange={event => changePrice(index, { description_translations: { ...price.description_translations, [language]: event.target.value } })} />
            </div>
            <div><label htmlFor={`ticket-price-${index}`} className="mb-1 block">{m.price}</label>
              <input id={`ticket-price-${index}`} type="number" required min="0" max="999999.99" step="0.01" className={inputClass} value={price.price} onChange={event => changePrice(index, { price: event.target.value })} />
            </div>
            <button type="button" disabled={draft.ticket_prices.length === 1} className="text-sm text-red-700 underline disabled:opacity-40" onClick={() => setDraft({ ...draft, ticket_prices: draft.ticket_prices.filter((_, row) => row !== index) })}>{m.removePrice}</button>
          </fieldset>)}
          <button type="button" disabled={draft.ticket_prices.length >= 50} className="underline" onClick={() => setDraft({ ...draft, ticket_prices: [...draft.ticket_prices, emptyTicket()] })}>{m.addPrice}</button>
          <div className="flex gap-3">
            <button type="submit" className="rounded bg-[#3a5c03] px-4 py-2 text-white">{busy ? m.saving : m.save}</button>
            <button type="button" className="rounded border px-4 py-2" onClick={() => { setDraft(null); setError(false); }}>{m.cancel}</button>
          </div>
        </fieldset>
      </form>}
    </>}
  </section>;
}
