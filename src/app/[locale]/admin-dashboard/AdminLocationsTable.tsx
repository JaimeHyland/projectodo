"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

import type { LessonLocation } from "@/types/admin";

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
};

type Props = {
  locations: LessonLocation[];
  messages: Messages;
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


export default function AdminLocationsTable({ locations, messages }: Props) {
  const router = useRouter();

  const [editingLocation, setEditingLocation] = useState<LessonLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<LessonLocation | null>(null);
  const [courseLocation, setCourseLocation] = useState<LessonLocation | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(emptyCourseForm);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isOneOffCourse = courseForm.duration_type === "one_off";


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


async function confirmCreateCourse() {
  if (!courseLocation) return;

  const csrfToken = getCookie("csrftoken");

  const payload = {
    ...courseForm,
    location: courseLocation.id,
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
    setError("Could not create course.");
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
                    </button>d

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
              Create course for{" "}
              <span className="font-semibold">{courseLocation.name}</span>
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-medium">Course name</span>
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
                <span className="mb-1 block font-medium">Subject</span>
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
                  <option value="guitar">Guitar</option>
                  <option value="ukulele">Ukulele</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">Course type</span>
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
                  <option value="one_to_one">One-to-one</option>
                  <option value="group">Group</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-medium">Start date</span>
                  <input
                    type="date"
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
                  <span className="mb-1 block font-medium">Term type</span>
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
                    <option value="school_term">School term</option>
                    <option value="all_year">All year</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-medium">Duration type</span>
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
                    <option value="date_range">Date range</option>
                    <option value="one_off">One-off</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-medium">End date</span>
                  <input
                    type="date"
                    value={courseForm.end_date}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        end_date: event.target.value,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-medium">Start time</span>
                  <input
                    type="time"
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
                  <span className="mb-1 block font-medium">Duration</span>
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

              <label className="block">
                <span className="mb-1 block font-medium">Days of week</span>
                <input
                  value={courseForm.days_of_week}
                  onChange={(event) =>
                    setCourseForm((current) => ({
                      ...current,
                      days_of_week: event.target.value,
                    }))
                  }
                  placeholder="MO,TU,WE,TH,FR"
                  className="w-full rounded border px-3 py-2"
                />
              </label>
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