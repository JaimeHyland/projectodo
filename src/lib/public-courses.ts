import { apiUrl } from "@/lib/api";
import en from "@/messages/lessons/en.json";

export type CourseLabels = typeof en.courses;
export type PublicLocation = {
  id: number; name: string; street_address: string; postcode: string;
  city: string; state: string; country: string;
};
export type PublicCourses = {
  location: { id: number; name: string } | null;
  courses: { id: number; name: string; start_date: string; end_date: string | null;
    start_time: string; duration_minutes: number;
    place: { id: number; name: string } | null;
    location: { id: number; name: string } | null }[];
};
export async function fetchPublicCourses(location?: string, signal?: AbortSignal): Promise<PublicCourses> {
  const query = location === undefined ? "" : `?location=${encodeURIComponent(location)}`;
  const response = await fetch(`${apiUrl("courses/public")}${query}`, {
    cache: "no-store", credentials: "omit", signal,
  });
  if (!response.ok) throw new Error(response.status === 400 || response.status === 404 ? "invalid" : "error");
  return response.json();
}

export type PublicCourseLessonsData = {
  course: { id: number; name: string }; timezone: string;
  lessons: { id: number; date: string; start_time: string; duration_minutes: number; cancelled: boolean;
    place: { name: string } | null; location: { name: string } | null }[];
};
export async function fetchPublicCourseLessons(courseId: string, signal?: AbortSignal): Promise<PublicCourseLessonsData> {
  if (!/^[1-9][0-9]{0,9}$/.test(courseId)) throw new Error("invalid");
  const response = await fetch(apiUrl(`courses/public/${courseId}/`), { credentials: "omit", cache: "no-store", signal });
  if (!response.ok) throw new Error(response.status === 404 ? "invalid" : "error");
  const data = await response.json();
  if (!data || data.course?.id !== Number(courseId) || typeof data.course?.name !== "string"
    || typeof data.timezone !== "string" || !Array.isArray(data.lessons)
    || !data.lessons.every((lesson: PublicCourseLessonsData["lessons"][number]) => lesson
      && typeof lesson.id === "number" && typeof lesson.date === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(lesson.date) && !Number.isNaN(Date.parse(lesson.date))
      && typeof lesson.start_time === "string" && typeof lesson.duration_minutes === "number"
      && typeof lesson.cancelled === "boolean"
      && (lesson.place === null || typeof lesson.place?.name === "string")
      && (lesson.location === null || typeof lesson.location?.name === "string"))) throw new Error("error");
  return data;
}
