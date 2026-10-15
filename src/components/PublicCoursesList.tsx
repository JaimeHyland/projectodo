"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ContentPanel, PageShell } from "@/components/PageShell";
import { CourseEmptyModal } from "@/components/CourseEmptyModal";
import { fetchPublicCourses, type CourseLabels, type PublicCourses } from "@/lib/public-courses";

export function PublicCoursesList({ locale, labels, location }: {
  locale: string; labels: CourseLabels; location?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PublicCourses | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCourses(location, controller.signal).then(setData).catch((reason: Error) => {
      if (!controller.signal.aborted) setError(reason.message);
    });
    return () => controller.abort();
  }, [location, attempt]);
  const back = `/${locale}/lessons/`;
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  return (
    <PageShell title={labels.title} accent="gold" maxWidth="5xl">
      <Link href={back} className="inline-block underline underline-offset-4">{labels.back}</Link>
      {error ? <ContentPanel>
        <p role="alert">{error === "invalid" ? labels.invalid : labels.error}</p>
        {error !== "invalid" && <button className="mt-4 underline" onClick={() => { setError(null); setAttempt(attempt + 1); }}>{labels.retry}</button>}
      </ContentPanel> : data === null ? <p role="status">{labels.loading}</p> : data.courses.length === 0 ? <>
        <p>{location !== undefined ? labels.emptyLocation : labels.emptyAll}</p>
        <CourseEmptyModal labels={labels} filtered={location !== undefined} onClose={() => router.replace(back)} />
      </> : <>
        <h2 className="text-xl font-semibold">{data.location?.name ?? labels.all}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.courses.map((course) => <li key={course.id}>
            <Link href={`/${locale}/lessons/courses/${course.id}/${location ? `?location=${encodeURIComponent(location)}` : ""}`}
              className="block h-full rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 hover:underline">
            <ContentPanel className="h-full space-y-2">
              <h3 className="text-xl font-bold">{course.name}</h3>
              <p>{course.location?.name ?? labels.unassigned}{course.place ? ` · ${course.place.name}` : ""}</p>
              <p>{formatDate(course.start_date)}{course.end_date ? ` – ${formatDate(course.end_date)}` : ""}</p>
              <p>{course.start_time.slice(0, 5)} · {course.duration_minutes} {labels.minutes}</p>
            </ContentPanel>
            </Link>
          </li>)}
        </ul>
      </>}
    </PageShell>
  );
}
