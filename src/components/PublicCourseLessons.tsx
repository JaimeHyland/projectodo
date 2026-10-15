"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContentPanel, PageShell } from "@/components/PageShell";
import { fetchPublicCourseLessons, type PublicCourseLessonsData, type CourseLabels } from "@/lib/public-courses";
import type en from "@/messages/lessons/en.json";

export function PublicCourseLessons({ locale, courseId, labels, courseLabels, location }: {
  locale: string; courseId: string; labels: typeof en.courseLessons; courseLabels: CourseLabels; location?: string;
}) {
  const [data, setData] = useState<PublicCourseLessonsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCourseLessons(courseId, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "error"); });
    return () => controller.abort();
  }, [courseId, attempt]);
  const back = `/${locale}/lessons/courses/${location ? `?location=${encodeURIComponent(location)}` : ""}`;
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
  return <PageShell title={data?.course.name ?? labels.title} accent="gold" maxWidth="5xl">
    <Link href={back} className="inline-block underline underline-offset-4">{labels.back}</Link>
    {error ? <ContentPanel><p role="alert">{error === "invalid" ? labels.invalid : labels.error}</p>
      {error !== "invalid" && <button type="button" className="mt-4 underline" onClick={() => { setError(null); setAttempt(n => n + 1); }}>{courseLabels.retry}</button>}
    </ContentPanel> : !data ? <p role="status">{labels.loading}</p> : <>
      <h2 className="text-xl font-semibold">{labels.title}</h2>
      <p>{labels.timezone}: {data.timezone}</p>
      {data.lessons.length === 0 ? <ContentPanel><p>{labels.empty}</p></ContentPanel>
        : <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left">
            <caption className="sr-only">{labels.title}</caption>
            <thead className="bg-gray-50 text-sm text-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3">{labels.dateHeader}</th>
                <th scope="col" className="px-4 py-3">{labels.timeHeader}</th>
                <th scope="col" className="px-4 py-3">{labels.venueHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">{data.lessons.map(lesson => <tr key={lesson.id}>
              <th scope="row" className="px-4 py-4 font-semibold">
                <time dateTime={lesson.date}>{date(lesson.date)}</time>
                {lesson.cancelled && <p className="mt-1 text-sm text-red-700">{labels.cancelled}</p>}
              </th>
              <td className="px-4 py-4"><time dateTime={`${lesson.date}T${lesson.start_time}`}>{lesson.start_time.slice(0, 5)}</time> / {lesson.duration_minutes} {courseLabels.minutes}</td>
              <td className="px-4 py-4">{lesson.location?.name ?? courseLabels.unassigned}{lesson.place ? ` / ${lesson.place.name}` : ` / ${labels.placeOpen}`}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </>}
  </PageShell>;
}
