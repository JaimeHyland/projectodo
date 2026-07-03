"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

import type { LessonLocation } from "@/types/admin";

export type AppLocale = "en" | "de" | "es";

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift()
    : undefined;
}


type LocationFormState = Omit<LessonLocation, "id">;

type Messages = {
  addLocation: string;
  createCourse: string;
  edit: string;
  delete: string;
  confirm: string;
  undoChanges: string;
  dontDelete: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  actions: string;
  editLocation: string;
  ConfirmDeleteLocation: string;
  deleteWarning: string;
  couldNotSaveLocation: string;
  couldNotDeleteLocation: string;
  courseName: string;
  courseSubject: string;
  guitar: string;
  ukulele: string;
  courseType: string;
  oneToOne: string;
  group: string;
  courseStartDate: string;
  courseEndDate: string;
  courseTermType: string;
  optionSchoolTerm: string;
  optionAllYear: string;
  courseDurationType: string;
  optionDateRange: string;
  optionOneOff: string;
  courseStartTime: string;
  courseDuration: string;
  courseDays: string;
  createCourseFor: string;
  couldNotCreateCourse: string;
  dayMondayShort: string;
  dayTuesdayShort: string;
  dayWednesdayShort: string;
  dayThursdayShort: string;
  dayFridayShort: string;
  daySaturdayShort: string;
  daySundayShort: string;
  daysOfWeek: string;
};

type Props = {
  locations: LessonLocation[];
  messages: Messages;
  locale: AppLocale;
};


type CourseFormState = {
  name: string;
  course_type: "one_to_one" | "group";
  subject: "guitar" | "ukulele";
  term_type: "school_term" | "all_year";
  duration_type: "one_off" | "date_range";
  start_date: string;
  end_date: string;
  start_time: string;
  duration_minutes: number;
  days_of_week: string;
  max_participants: number;
};


const emptyForm: LocationFormState = {
  name: "",
  street_address: "",
  city: "",
  state: "",
  postcode: "",
  country: "Germany",
};


const emptyCourseForm: CourseFormState = {
  name: "",
  course_type: "one_to_one",
  subject: "guitar",
  term_type: "school_term",
  duration_type: "date_range",
  start_date: "",
  end_date: "",
  start_time: "",
  duration_minutes: 60,
  days_of_week: "MO",
  max_participants: 1,
};


function htmlInputLocale(locale: AppLocale) {
  if (locale === "de") return "de-DE";
  if (locale === "es") return "es-ES";
  return "en-GB";
}


export default function AdminLocationsTable({ locations, messages, locale }: Props) {
  const router = useRouter();

  const [editingLocation, setEditingLocation] = useState<LessonLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<LessonLocation | null>(null);
  const [courseLocation, setCourseLocation] = useState<LessonLocation | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(emptyCourseForm);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const inputLocale = htmlInputLocale(locale);

  const isOneOffCourse = courseForm.duration_type === "one_off";

  const dayOptions = [
    { code: "MO", label: messages.dayMondayShort },
    { code: "TU", label: messages.dayTuesdayShort },
    { code: "WE", label: messages.dayWednesdayShort },
    { code: "TH", label: messages.dayThursdayShort },
    { code: "FR", label: messages.dayFridayShort },
    { code: "SA", label: messages.daySaturdayShort },
    { code: "SU", label: messages.daySundayShort },
  ];

  const appLocale: AppLocale = 
  locale === "de" ? "de" : locale === "es" ? "es" : "en";

  function toggleCourseDay(dayCode: string) {
    setCourseForm((current) => {
      const selectedDays = current.days_of_week
        .split(",")
        .map((day) => day.trim())
        .filter(Boolean);

      const nextDays = selectedDays.includes(dayCode)
        ? selectedDays.filter((day) => day !== dayCode)
        : [...selectedDays, dayCode];

      return {
        ...current,
        days_of_week: nextDays.join(","),
      };
    });
  }


  function openCreateCourse(location: LessonLocation) {
    setCourseLocation(location);
    setCourseForm(emptyCourseForm);
    setError(null);
  }


  function closeCourseForm() {
    setCourseLocation(null);
    setCourseForm(emptyCourseForm);
    setError(null);
  }


  function openEdit(location: LessonLocation) {
    setEditingLocation(location);
    setForm({
      name: location.name,
      street_address: location.street_address,
      city: location.city,
      state: location.state,
      postcode: location.postcode,
      country: location.country,
    });
    setError(null);
  }


  async function confirmSave() {
    const csrfToken = getCookie("csrftoken");

    const endpoint = editingLocation
      ? `courses/locations/${editingLocation.id}/update/`
      : "courses/locations/create/";

    const res = await fetch(apiUrl(endpoint), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken ?? "",
      },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Save location failed", errorText);
      setError(messages.couldNotSaveLocation);
      return;
    }

    closeForm();
    router.refresh();
  }

  async function confirmDelete() {
    if (!deletingLocation) return;

    const csrfToken = getCookie("csrftoken");

    const res = await fetch(apiUrl(`courses/locations/${deletingLocation.id}/delete/`), {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRFToken": csrfToken ?? "",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Delete location failed", errorText);
      setError(messages.couldNotDeleteLocation);
      return;
    }

    setDeletingLocation(null);
    router.refresh();
  }

  function openCreate() {
  setIsCreating(true);
  setEditingLocation(null);
  setForm(emptyForm);
  setError(null);
}

function closeForm() {
  setIsCreating(false);
  setEditingLocation(null);
  setForm(emptyForm);
  setError(null);
}


  const formOpen = isCreating || editingLocation !== null;

  function validateCourseForm(): string | null {
    if (!courseForm.name.trim()) {
      return "Course name is required.";
    }

    if (!courseForm.start_date) {
      return "Start date is required.";
    }

    if (!courseForm.start_time) {
      return "Start time is required.";
    }

    if (courseForm.duration_type === "date_range") {
      if (!courseForm.end_date) {
        return "End date is required for date range courses.";
      }

      if (!courseForm.days_of_week.trim()) {
        return "At least one day of the week is required for date range courses.";
      }
    }

    return null;
  }


async function confirmCreateCourse() {
  if (!courseLocation) return;

    const validationError = validateCourseForm();

  if (validationError) {
    setError(validationError);
    return;
  }

  const csrfToken = getCookie("csrftoken");

  const payload = {
    ...courseForm,
    location: courseLocation.id,
    end_date: courseForm.duration_type === "one_off" ? null : courseForm.end_date,
    days_of_week: courseForm.duration_type === "one_off" ? "" : courseForm.days_of_week
  };

  const res = await fetch(apiUrl("courses/create/"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Create course failed", errorText);
    setError(messages.couldNotCreateCourse);
    return;
  }

  closeCourseForm();
  router.refresh();
}

  return (
    <>
      <div className="mb-4 text-right">
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-[#3a5c03] px-4 py-2 text-white"
        >
          {messages.addLocation}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2 text-left">{messages.name}</th>
              <th className="p-2 text-left">{messages.streetAddress}</th>
              <th className="p-2 text-left">{messages.city}</th>
              <th className="p-2 text-left">{messages.actions}</th>
            </tr>
          </thead>

          <tbody>
            {locations.map((location) => (
              <tr key={location.id} className="border-b">
                <td className="p-2">{location.name}</td>
                <td className="p-2">{location.street_address}</td>
                <td className="p-2">
                  {location.postcode} {location.city}
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openCreateCourse(location)}
                      className="rounded bg-[#3a5c03] px-3 py-1 text-white"
                    >
                      {messages.createCourse}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(location)}
                      className="rounded bg-gray-700 px-3 py-1 text-white"
                    >
                      {messages.edit}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingLocation(location)}
                      className="rounded bg-red-700 px-3 py-1 text-white"
                    >
                      {messages.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {editingLocation ? messages.editLocation : messages.addLocation}
            </h3>

            <div className="space-y-3">
              {[
                ["name", messages.name],
                ["street_address", messages.streetAddress],
                ["city", messages.city],
                ["state", messages.state],
                ["postcode", messages.postcode],
                ["country", messages.country],
              ].map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1 block font-medium">{label}</span>
                  <input
                    value={form[field as keyof LocationFormState]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  />
                </label>
              ))}
            </div>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.undoChanges}
              </button>

              <button
                type="button"
                onClick={confirmSave}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {courseLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.createCourse}
            </h3>

            <p className="mb-4">
              {messages.createCourseFor.replace("{name}", courseLocation.name)}
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-medium">{messages.courseName}</span>
                <input
                  value={courseForm.name}
                  onChange={(event) =>
                    setCourseForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{messages.courseSubject}</span>
                <select
                  value={courseForm.subject}
                  onChange={(event) =>
                    setCourseForm((current) => ({
                      ...current,
                      subject: event.target.value as CourseFormState["subject"],
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="guitar">{messages.guitar}</option>
                  <option value="ukulele">{messages.ukulele}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{messages.courseType}</span>
                <select
                  value={courseForm.course_type}
                  onChange={(event) =>
                    setCourseForm((current) => ({
                      ...current,
                      course_type: event.target.value as CourseFormState["course_type"],
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="one_to_one">{messages.oneToOne}</option>
                  <option value="group">{messages.group}</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-medium">{messages.courseStartDate}</span>
                  <input
                    type="date"
                    lang={inputLocale}
                    value={courseForm.start_date}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        start_date: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-medium">{messages.courseTermType}</span>
                  <select
                    value={courseForm.term_type}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        term_type: event.target.value as CourseFormState["term_type"],
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="school_term">{messages.optionSchoolTerm}</option>
                    <option value="all_year">{messages.optionAllYear}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-medium">{messages.courseDurationType}</span>
                  <select
                    value={courseForm.duration_type}
                    onChange={(event) => {
                      const durationType = event.target.value as CourseFormState["duration_type"];

                      setCourseForm((current) => ({
                        ...current,
                        duration_type: durationType,
                        end_date: durationType === "one_off" ? "" : current.end_date,
                        days_of_week: durationType === "one_off" ? "" : current.days_of_week || "MO",
                      }));
                    }}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="date_range">{messages.optionDateRange}</option>
                    <option value="one_off">{messages.optionOneOff}</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-medium">{messages.courseEndDate}</span>
                  <input
                    type="date"
                    lang={inputLocale}
                    value={courseForm.end_date}
                    disabled={isOneOffCourse}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        end_date: event.target.value,
                      }))
                    }
                    className={
                      isOneOffCourse
                        ? "w-full rounded border bg-gray-100 px-3 py-2 text-gray-500"
                        : "w-full rounded border px-3 py-2"
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-medium">{messages.courseStartTime}</span>
                  <input
                    type="time"
                    lang={inputLocale}
                    value={courseForm.start_time}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        start_time: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-medium">{messages.courseDuration}</span>
                  <input
                    type="number"
                    value={courseForm.duration_minutes}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        duration_minutes: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  />
                </label>
              </div>

              {!isOneOffCourse && (
                <div className="block">
                  <span className="mb-1 block font-medium">{messages.daysOfWeek}</span>

                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map((day) => {
                      const selectedDays = courseForm.days_of_week
                        .split(",")
                        .map((selectedDay) => selectedDay.trim())
                        .filter(Boolean);

                      const isSelected = selectedDays.includes(day.code);

                      return (
                        <button
                          key={day.code}
                          type="button"
                          onClick={() => toggleCourseDay(day.code)}
                          className={
                            isSelected
                              ? "rounded bg-[#3a5c03] px-3 py-1 text-white"
                              : "rounded bg-gray-200 px-3 py-1 text-gray-900"
                          }
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCourseForm}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.undoChanges}
              </button>

              <button
                type="button"
                onClick={confirmCreateCourse}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.ConfirmDeleteLocation.replace("{name}", deletingLocation.name)}
            </h3>

            <p>{messages.deleteWarning}</p>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLocation(null)}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.dontDelete}
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded bg-red-700 px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}