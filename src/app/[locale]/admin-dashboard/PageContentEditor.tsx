"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { apiUrl } from "@/lib/api";

type Item = {
  id: string; page: string; section: string; kind: string;
  values: Record<string, string>; fallbacks: Record<string, string>;
};
export type CmsMessages = {
  title: string; language: string; page: string; field: string; value: string;
  missing: string; blank: string; save: string; saved: string; error: string;
  loading: string; upload: string; imageHelp: string; retry: string; currentImage: string;
  image_size: string; image_format: string; image_storage: string;
};

export default function PageContentEditor({ locale, messages: m }: { locale: string; messages: CmsMessages }) {
  const router = useRouter();
  const inputId = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [locales, setLocales] = useState<string[]>([]);
  const [language, setLanguage] = useState(locale);
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("content/admin"), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("load");
        const data = await response.json();
        setItems(data.items); setLocales(data.locales); setLoaded(true); setNotice(null);
      }).catch(() => { if (!controller.signal.aborted) setNotice({ error: true, text: m.error }); });
    return () => controller.abort();
  }, [attempt, m.error]);

  const visible = items.filter(item => item.page === page);
  const item = visible.find(item => item.id === selected) ?? visible[0];
  const draftKey = item ? `${item.id}:${language}` : "";
  const original = item?.values[language] ?? item?.fallbacks[language] ?? "";
  const value = drafts[draftKey] ?? original;
  const dirty = value !== original || !!item && !Object.hasOwn(item.values, language);
  const preview = item?.values[language] ?? item?.fallbacks[language];
  const inputClass = "rounded border border-black/20 bg-white px-3 py-2 text-sm";

  async function save(file?: File) {
    if (!item) return;
    const id = item.id;
    const key = draftKey;
    setBusy(true); setNotice(null);
    try {
      const form = new FormData();
      if (file) form.set("image", file);
      const response = await fetch(apiUrl(`content/admin/${id}/${language}${file ? "/image" : ""}`), {
        method: file ? "POST" : "PATCH", credentials: "include",
        headers: { "X-CSRFToken": Cookies.get("csrftoken") ?? "", ...(!file ? { "Content-Type": "application/json" } : {}) },
        body: file ? form : JSON.stringify({ value }),
      });
      const result = await response.json();
      if (!response.ok) {
        const code: unknown = result.error;
        const message = code === "image_size" || code === "image_format" || code === "image_storage" ? m[code] : m.error;
        setNotice({ error: true, text: message }); return;
      }
      setItems(previous => previous.map(row => row.id === id
        ? { ...row, values: { ...row.values, [language]: result.value } } : row));
      setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
      setNotice({ error: false, text: m.saved }); router.refresh();
    } catch { setNotice({ error: true, text: m.error }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div aria-live="polite">
        {!loaded && !notice && <p role="status">{m.loading}</p>}
        {busy && <p role="status">{m.loading}</p>}
        {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-red-700" : "text-green-800"}>{notice.text} {!loaded && <button onClick={() => { setNotice(null); setAttempt(attempt + 1); }} className="underline">{m.retry}</button>}</p>}
      </div>
      {loaded && <>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm"><label htmlFor={`${inputId}-language`}>{m.language}</label>
            <select id={`${inputId}-language`} className={inputClass} value={language} disabled={busy} onChange={event => { setLanguage(event.target.value); setNotice(null); }}>
              {locales.map(code => <option key={code} value={code}>{code.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm"><label htmlFor={`${inputId}-page`}>{m.page}</label>
            <select id={`${inputId}-page`} className={inputClass} value={page} disabled={busy} onChange={event => { setPage(event.target.value); setSelected(""); setNotice(null); }}>
              {[...new Set(items.map(row => row.page))].map(name => <option key={name}>{name}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1 text-sm"><label htmlFor={`${inputId}-field`}>{m.field}</label>
          <select id={`${inputId}-field`} className={`${inputClass} w-full`} value={item?.id ?? ""} disabled={busy} onChange={event => { setSelected(event.target.value); setNotice(null); }}>
            {visible.map(row => <option key={row.id} value={row.id}>
              {row.section} / {row.id.split(".").at(-1)}{!Object.hasOwn(row.values, language) ? ` — ${m.missing}` : ""}
            </option>)}
          </select>
        </div>
        {item && <>
          <p className="text-xs text-[#68645e]">{m.missing}: {locales.filter(code => !Object.hasOwn(item.values, code)).join(", ") || "—"}</p>
          {item.kind === "image" ? <>
            {preview && <Image src={preview} alt={m.currentImage} width={360} height={240} unoptimized className="h-40 w-60 rounded border border-black/10 object-contain" />}
            <div className="text-sm"><label htmlFor={`${inputId}-upload`}>{m.upload}</label>
              <input id={`${inputId}-upload`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="ml-2 max-w-full"
                onChange={event => {
                  const file = event.target.files?.[0]; event.target.value = "";
                  if (file) { if (file.size > 5 * 1024 * 1024) setNotice({ error: true, text: m.image_size }); else void save(file); }
                }} />
            </div>
            <p className="text-xs text-[#68645e]">{m.imageHelp}</p>
          </> : <>
            <div className="space-y-1 text-sm"><label htmlFor={`${inputId}-value`}>{m.value}</label>
              <textarea id={`${inputId}-value`} className={`${inputClass} block w-full`} rows={6} maxLength={20000} disabled={busy} value={value}
                onChange={event => { setDrafts({ ...drafts, [draftKey]: event.target.value }); setNotice(null); }} />
            </div>
            <p className="text-xs text-[#68645e]">{m.blank}</p>
            <button disabled={busy || !dirty} onClick={() => save()} className="rounded border border-black/20 bg-[#f0eee8] px-4 py-2 text-sm font-semibold disabled:opacity-50">{m.save}</button>
          </>}
        </>}
      </>}
    </div>
  );
}
