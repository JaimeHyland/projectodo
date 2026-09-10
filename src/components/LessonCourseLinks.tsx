"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { apiUrl } from "@/lib/api";
import { fetchPublicCourses, type CourseLabels, type PublicLocation } from "@/lib/public-courses";
import { CourseEmptyModal } from "@/components/CourseEmptyModal";

export function LessonCourseLinks({ locale, labels, locationError }: {
  locale: string; labels: CourseLabels; locationError: string;
}) {
  const router = useRouter();
  const [locations, setLocations] = useState<PublicLocation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [empty, setEmpty] = useState<boolean | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("courses/locations"), { cache: "no-store", credentials: "omit", signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setLocations(data.locations))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);
  const href = (id?: number) => `/${locale}/lessons/courses/${id === undefined ? "" : `?location=${id}`}`;
  async function open(event: MouseEvent<HTMLAnchorElement>, id?: number) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.currentTarget.focus();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(false);
    try {
      const result = await fetchPublicCourses(id === undefined ? undefined : String(id), controller.signal);
      if (result.courses.length) router.push(href(id));
      else setEmpty(id !== undefined);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="space-y-4" aria-busy={busy}>
      <Link href={href()} prefetch={false} onClick={(event) => open(event)}
        className="inline-block font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2">
        {labels.all}
      </Link>
      {busy && <p role="status">{labels.loading}</p>}
      {error && <p role="alert">{labels.error}</p>}
      {failed ? <p role="alert">{locationError}</p> : locations === null ? <p role="status">{labels.locationsLoading}</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((location) => (
            <Link key={location.id} href={href(location.id)} prefetch={false} onClick={(event) => open(event, location.id)}
              className="block rounded-xl border border-black/10 bg-[#f8f7f3] p-4 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d5a300]">
              <h4 className="font-semibold underline underline-offset-4">{location.name}</h4>
              <p>{location.street_address}</p>
              <p>{location.postcode} {location.city}{location.state ? ` - ${location.state}` : ""}</p>
              <p>{location.country}</p>
            </Link>
          ))}
        </div>
      )}
      {empty !== null && <CourseEmptyModal labels={labels} filtered={empty} onClose={() => setEmpty(null)} />}
    </div>
  );
}
