"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

import type { AdminCourse, LessonLocation } from "@/types/admin";

export type AppLocale = "en" | "de" | "es";

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift()
    : undefined;
}


type LocationFormState = Omit<LessonLocation, "id" | "location_type">;

type Messages = {
  addLocation: string;
  createCourse: string;
  manageCourses: string;
  coursesFor: string;
  createNewCourse: string;
  noCoursesForLocation: string;
  loadingCourses: string;
  couldNotLoadCourses: string;
  editCourse: string;
  couldNotUpdateCourse: string;
  edit: string;
  delete: string;
  close: string;
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
  defaultPlace: string;
  noDefaultPlace: string;
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
  places: string;
  saveLocationBeforeCreatingPlaces: string;
  createPlaceForThisLocation: string;
  createAtLeastOnePlaceBeforeScheduling: string;
  noPlacesCreatedForLocation: string;
  placeName: string;
  participantCapacity: string;
  notes: string;
  locationLabel: string;
  placeNameRequired: string;
  couldNotCreatePlace: string;
  capacity: string;
  deletePlace: string;
  confirmDeletePlace: string;
  couldNotDeletePlace: string;
};

type DashboardPlace = {
  id: number;
  name: string;
  capacity: number | null;
  notes: string;
  location: number;
};

type DashboardLocation = LessonLocation & {
  places?: DashboardPlace[];
};

type Props = {
  locations: DashboardLocation[];
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
  default_place: number | null;
};

type CoursesResponse = {
  courses: AdminCourse[];
};

type PlaceFormState = {
  name: string;
  capacity: string;
  notes: string;
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
  default_place: null,
};

const emptyPlaceForm: PlaceFormState = {
  name: "",
  capacity: "",
  notes: "",
};


function htmlInputLocale(locale: AppLocale) {
  if (locale === "de") return "de-DE";
  if (locale === "es") return "es-ES";
  return "en-GB";
}


export default function AdminLocationsTable({ locations, messages, locale }: Props) {
  const router = useRouter();

  const [editingLocation, setEditingLocation] = useState<DashboardLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<DashboardLocation | null>(null);
  const [courseManagerLocation, setCourseManagerLocation] = useState<DashboardLocation | null>(null);
  const [managedCourses, setManagedCourses] = useState<AdminCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [courseLocation, setCourseLocation] = useState<DashboardLocation | null>(null);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(emptyCourseForm);
  const [deletingPlace, setDeletingPlace] = useState<DashboardPlace | null>(null);

  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const inputLocale = htmlInputLocale(locale);

  const isOneOffCourse = courseForm.duration_type === "one_off";
  const availableCoursePlaces = (courseLocation?.places ?? []).filter(
    (place) => place.location === courseLocation?.id,
  );

  const dayOptions = [
    { code: "MO", label: messages.dayMondayShort },
    { code: "TU", label: messages.dayTuesdayShort },
    { code: "WE", label: messages.dayWednesdayShort },
    { code: "TH", label: messages.dayThursdayShort },
    { code: "FR", label: messages.dayFridayShort },
    { code: "SA", label: messages.daySaturdayShort },
    { code: "SU", label: messages.daySundayShort },
  ];


  const [placeLocation, setPlaceLocation] = useState<DashboardLocation | null>(null);
  const [placeForm, setPlaceForm] = useState<PlaceFormState>(emptyPlaceForm);

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


  async function openManageCourses(location: DashboardLocation) {
    setCourseManagerLocation(location);
    setManagedCourses([]);
    setIsLoadingCourses(true);
    setError(null);

    const response = await fetch(
      apiUrl(`courses/locations/${location.id}/courses/`),
      { credentials: "include" },
    );

    if (!response.ok) {
      console.error("Load courses failed", await response.text());
      setError(messages.couldNotLoadCourses);
      setIsLoadingCourses(false);
      return;
    }

    const data: CoursesResponse = await response.json();
    setManagedCourses(data.courses);
    setIsLoadingCourses(false);
  }

  function closeCourseManager() {
    setCourseManagerLocation(null);
    setManagedCourses([]);
    setIsLoadingCourses(false);
    setError(null);
  }

  function openCreateCourse(location: DashboardLocation) {
    setCourseManagerLocation(null);
    setCourseLocation(location);
    setEditingCourse(null);
    setCourseForm({
      ...emptyCourseForm,
      default_place: null,
    });
    setError(null);
  }

  function openEditCourse(course: AdminCourse) {
    if (!courseManagerLocation) return;

    setCourseLocation(courseManagerLocation);
    setCourseManagerLocation(null);
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      course_type: course.course_type,
      subject: course.subject,
      term_type: course.term_type,
      duration_type: course.duration_type,
      start_date: course.start_date,
      end_date: course.end_date ?? "",
      start_time: course.start_time.slice(0, 5),
      duration_minutes: course.duration_minutes,
      days_of_week: course.days_of_week,
      max_participants: course.max_participants,
      default_place: course.default_place,
    });
    setError(null);
  }


  function closeCourseForm() {
    setCourseLocation(null);
    setEditingCourse(null);
    setCourseForm(emptyCourseForm);
    setError(null);
  }

    function openCreatePlace(location: DashboardLocation) {
    setPlaceLocation(location);
    setPlaceForm(emptyPlaceForm);
    setError(null);
  }

  function closePlaceForm() {
    setPlaceLocation(null);
    setPlaceForm(emptyPlaceForm);
    setError(null);
  }

  function openEdit(location: DashboardLocation) {
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


  async function confirmCreatePlace() {
    if (!placeLocation) return;

    if (!placeForm.name.trim()) {
      setError(messages.placeNameRequired);
      return;
    }

    const csrfToken = getCookie("csrftoken");

    const payload = {
      name: placeForm.name.trim(),
      capacity: placeForm.capacity ? Number(placeForm.capacity) : null,
      notes: placeForm.notes.trim(),
    };

    const res = await fetch(
      apiUrl(`courses/locations/${placeLocation.id}/places/create/`),
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken ?? "",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Create place failed", errorText);
      setError(messages.couldNotCreatePlace);
      return;
    }

    const createdPlace = await res.json();

    setEditingLocation((current) => {
      if (!current || current.id !== placeLocation.id) {
        return current;
      }

      return {
        ...current,
        places: [...(current.places ?? []), createdPlace],
      };
    });

    closePlaceForm();
    router.refresh();
  }


  async function confirmDeletePlace() {
  if (!deletingPlace) return;

  const csrfToken = getCookie("csrftoken");

  const res = await fetch(apiUrl(`courses/places/${deletingPlace.id}/delete/`), {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRFToken": csrfToken ?? "",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Delete place failed", errorText);
    setError("Could not delete place.");
    return;
  }

  const deletedPlaceId = deletingPlace.id;

  setEditingLocation((current) => {
    if (!current) return current;

    return {
      ...current,
      places: (current.places ?? []).filter(
        (place) => place.id !== deletedPlaceId,
      ),
    };
  });

  setDeletingPlace(null);
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


async function confirmSaveCourse() {
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
    default_place:
      courseLocation.location_type === "physical"
        ? courseForm.default_place
        : null,
    end_date: courseForm.duration_type === "one_off" ? null : courseForm.end_date,
    days_of_week: courseForm.duration_type === "one_off" ? "" : courseForm.days_of_week
  };

  const endpoint = editingCourse
    ? `courses/${editingCourse.id}/update/`
    : "courses/create/";

  const res = await fetch(apiUrl(endpoint), {
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
    console.error("Save course failed", errorText);
    setError(
      editingCourse
        ? messages.couldNotUpdateCourse
        : messages.couldNotCreateCourse,
    );
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
                      onClick={() => openManageCourses(location)}
                      className="rounded bg-[#3a5c03] px-3 py-1 text-white"
                    >
                      {messages.manageCourses}
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded bg-white p-4 shadow-lg sm:p-6">
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

            {isCreating && (
              <div className="mt-6 rounded border bg-gray-50 p-4">
                <h4 className="mb-2 font-semibold">Places</h4>
                <p className="text-sm text-gray-700">
                  {messages.saveLocationBeforeCreatingPlaces}
                </p>
              </div>
            )}

            {editingLocation && (
              <div className="mt-6 rounded border bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-semibold">{messages.places}</h4>

                  <button
                    type="button"
                    onClick={() => openCreatePlace(editingLocation)}
                    className="rounded bg-[#3a5c03] px-3 py-1 text-white"
                  >
                    {messages.createPlaceForThisLocation}
                  </button>
                </div>

                {editingLocation.places?.length ? (
                  <ul className="space-y-2 text-sm">
                    {editingLocation.places.map((place) => (
                      <li key={place.id} className="rounded border bg-white p-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{place.name}</div>

                            {place.capacity !== null && (
                              <div className="text-gray-700">
                                {messages.capacity}: {place.capacity}
                              </div>
                            )}

                            {place.notes && (
                              <div className="text-gray-700">
                                {place.notes}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setDeletingPlace(place)}
                            className="rounded bg-red-700 px-2 py-1 text-white"
                          >
                            {messages.delete}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700">
                    {messages.noPlacesCreatedForLocation}
                  </p>
                )}
              </div>
            )}

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

      {courseManagerLocation && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded bg-white p-4 shadow-lg sm:p-6">
            <h3 className="text-lg font-semibold">{messages.manageCourses}</h3>
            <p className="mb-4 text-gray-700">
              {messages.coursesFor.replace("{name}", courseManagerLocation.name)}
            </p>

            {isLoadingCourses ? (
              <p className="rounded border bg-gray-50 p-4 text-gray-700">
                {messages.loadingCourses}
              </p>
            ) : managedCourses.length ? (
              <ul className="space-y-2">
                {managedCourses.map((course) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => openEditCourse(course)}
                      className="w-full rounded border bg-white p-3 text-left hover:bg-gray-50"
                    >
                      <span className="block font-medium">{course.name}</span>
                      <span className="block text-sm text-gray-700">
                        {course.subject === "guitar" ? messages.guitar : messages.ukulele}
                        {" · "}
                        {course.course_type === "one_to_one" ? messages.oneToOne : messages.group}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : !error ? (
              <p className="rounded border bg-gray-50 p-4 text-gray-700">
                {messages.noCoursesForLocation}
              </p>
            ) : null}

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeCourseManager}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.close}
              </button>
              <button
                type="button"
                onClick={() => openCreateCourse(courseManagerLocation)}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.createNewCourse}
              </button>
            </div>
          </div>
        </div>
      )}

      {courseLocation && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded bg-white p-4 shadow-lg sm:p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {editingCourse ? messages.editCourse : messages.createCourse}
            </h3>

            <p className="mb-4">
              {messages.coursesFor.replace("{name}", courseLocation.name)}
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

              {courseLocation.location_type === "physical" && (
                <label className="block">
                  <span className="mb-1 block font-medium">
                    {messages.defaultPlace}
                  </span>
                  <select
                    value={courseForm.default_place ?? ""}
                    onChange={(event) =>
                      setCourseForm((current) => ({
                        ...current,
                        default_place: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">{messages.noDefaultPlace}</option>
                    {availableCoursePlaces.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

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
                onClick={confirmSaveCourse}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded bg-white p-4 shadow-lg sm:p-6">
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
      {placeLocation && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded bg-white p-4 shadow-lg sm:p-6">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.createPlaceForThisLocation}
            </h3>

            <p className="mb-4">
              {messages.locationLabel}: <span className="font-semibold">{placeLocation.name}</span>
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-medium">{messages.placeName}</span>
                <input
                  value={placeForm.name}
                  onChange={(event) =>
                    setPlaceForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{messages.participantCapacity}</span>
                <input
                  type="number"
                  min="1"
                  value={placeForm.capacity}
                  onChange={(event) =>
                    setPlaceForm((current) => ({
                      ...current,
                      capacity: event.target.value,
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-medium">{messages.notes}</span>
                <textarea
                  value={placeForm.notes}
                  onChange={(event) =>
                    setPlaceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded border px-3 py-2"
                />
              </label>
            </div>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePlaceForm}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.undoChanges}
              </button>

              <button
                type="button"
                onClick={confirmCreatePlace}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
      {deletingPlace && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded bg-white p-4 shadow-lg sm:p-6">
            <h3 className="mb-4 text-lg font-semibold">
              Delete place?
            </h3>

            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingPlace.name}</span>?
            </p>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPlace(null)}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.dontDelete}
              </button>

              <button
                type="button"
                onClick={confirmDeletePlace}
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
