"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift()
    : undefined;
}

type LessonLocation = {
  id: number;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

type LocationFormState = Omit<LessonLocation, "id">;

type Messages = {
  addLocation: string;
  edit: string;
  delete: string;
  confirm: string;
  undoChanges: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  actions: string;
  editLocation: string;
  deleteLocationQuestion: string;
  deleteWarning: string;
  couldNotSaveLocation: string;
  couldNotDeleteLocation: string;
};

type Props = {
  locations: LessonLocation[];
  messages: Messages;
};

const emptyForm: LocationFormState = {
  name: "",
  street_address: "",
  city: "",
  state: "",
  postcode: "",
  country: "Germany",
};

export default function AdminLocationsTable({ locations, messages }: Props) {
  const router = useRouter();

  const [editingLocation, setEditingLocation] = useState<LessonLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<LessonLocation | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);


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
      ? `classes/locations/${editingLocation.id}/update/`
      : "classes/locations/create/";

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

    const res = await fetch(apiUrl(`classes/locations/${deletingLocation.id}/delete/`), {
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

      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.deleteLocationQuestion.replace("{name}", deletingLocation.name)}
            </h3>

            <p>{messages.deleteWarning}</p>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLocation(null)}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.undoChanges}
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