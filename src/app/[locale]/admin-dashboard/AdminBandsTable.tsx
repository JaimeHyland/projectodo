"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"
import { apiUrl } from "@/lib/api";
import type { AdminUser, AdminBand } from "@/types/admin";

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift()
    : undefined;
}

type Messages = {
  name: string;
  description: string;
  bandLeaderLabel: string;
  contactEmail: string;
  contactTel: string;
  websiteUrl: string;
  genres: string;
  published: string;
  createBand: string;
  editBand: string;
  confirm: string;
  undoChanges: string;
  dontDelete: string;
  actions: string;
  edit: string;
  delete: string;
  couldNotCreateBand: string;
  couldNotUpdateBand: string;
  couldNotDeleteBand: string;
  confirmDeleteBand: string;
  deleteWarning: string;
};


type AdminBandTableProps = {
  bands: AdminBand[];
  users: AdminUser[];
  messages: Messages;
  locale: string;
};

export default function AdminBandsTable({
  bands,
  users,
  messages,
  locale,
}: AdminBandTableProps) {
  console.log("AdminBandsTable bands:", bands);
  const router = useRouter();
  const currentUser = users.find(
    (user) => user.is_current_user
  );
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [genres, setGenres] = useState("");
  const [bandLeaderId, setBandLeaderId] = useState(
    currentUser ? String(currentUser.id) : ""
  );
  const [error, setError] = useState<string | null>(null);

  
  const [deletingBand, setDeletingBand] = useState<AdminBand | null>(null);
  const [editingBand, setEditingBand] = useState<AdminBand | null>(null);

  const visibleBands = bands.filter(
  (band): band is AdminBand => band !== null && band !== undefined,
);

  function openEdit(band: AdminBand) {
    setEditingBand(band);
    setName(band.name);
    setDescription(band.description);
    setContactEmail(band.contact_email);
    setContactTel(band.contact_tel);
    setWebsiteUrl(band.website_url);
    setGenres(band.genres.join(", "));
    setBandLeaderId(band.band_leader ? String(band.band_leader.id) : "");
    setError(null);
  }

  async function confirmCreate() {
    const csrfToken = getCookie("csrftoken");

    const res = await fetch(apiUrl("bands/admin/bands/"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken ?? "",
      },
      body: JSON.stringify({
        name,
        description,
        band_leader_id: bandLeaderId ? Number(bandLeaderId) : null,
        contact_email: contactEmail,
        contact_tel: contactTel,
        website_url: websiteUrl,
        genres: genres
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? messages.couldNotCreateBand);
      return;
    }

    setIsCreating(false);
    setName("");
    setDescription("");
    setContactEmail("");
    setContactTel("");
    setWebsiteUrl("");
    setGenres("");
    setBandLeaderId(currentUser ? String(currentUser.id) : "");
    setError(null);

    router.refresh();
  }

  async function confirmDelete() {
  if (!deletingBand) return;

  const csrfToken = getCookie("csrftoken");

  const res = await fetch(apiUrl(`bands/admin/bands/${deletingBand.id}/`), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
    },
    body: JSON.stringify({ action: "delete" }),
  });

  if (!res.ok) {
    const data = await res.json();
    setError(data.error ?? messages.couldNotDeleteBand);
    return;
  }

  setDeletingBand(null);
  router.refresh();
}

async function confirmEdit() {
  if (!editingBand) return;

  const csrfToken = getCookie("csrftoken");

  const resources = await fetch(apiUrl(`bands/admin/bands/${editingBand.id}/`), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
    },
    body: JSON.stringify({
      action: "edit",
      name,
      band_leader_id: bandLeaderId ? Number(bandLeaderId) : null,
      description,
      contact_email: contactEmail,
      contact_tel: contactTel,
      website_url: websiteUrl,
      genres: genres
        .split(",")
        .map((genre) => genre.trim())
        .filter(Boolean),
    }),
  });

  if (!resources.ok) {
    const data = await resources.json();
    setError(data.error ?? messages.couldNotUpdateBand);
    return;
  }

  setEditingBand(null);
  router.refresh();
}

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded bg-[#3a5c03] px-4 py-2 text-white"
        >
          {messages.createBand}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2 text-left">{messages.name}</th>
              <th className="p-2 text-left">{messages.bandLeaderLabel}</th>
              <th className="p-2 text-left">{messages.contactEmail}</th>
              <th className="p-2 text-left">{messages.genres}</th>
              <th className="p-2 text-center">{messages.published}</th>
              <th className="p-2 text-left">{messages.actions}</th>
            </tr>
          </thead>

          <tbody>
            {visibleBands.map((band) => (
              <tr key={band.id} className="border-b">
                <td className="p-2">{band.name}</td>
                <td className="p-2">{band.band_leader?.username ?? "—"}</td>
                <td className="p-2">{band.contact_email || "—"}</td>
                <td className="p-2">{band.genres.join(", ") || "—"}</td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={band.page?.published ?? false}
                    disabled
                    aria-label={`${messages.published}: ${band.name}`}
                    className="h-4 w-4 accent-[#3a5c03]"
                  />
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!band.can_manage}
                      onClick={() => openEdit(band)}
                      className="rounded bg-gray-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                    >
                      {messages.edit}
                    </button>
                    {band.can_manage && (
                      <Link
                        href={`/${locale}/admin-dashboard/bands/${band.id}/webpage`}
                        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
                      >
                        {band.page ? "Edit webpage" : "Create webpage"}
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={!band.can_delete}
                      onClick={() => setDeletingBand(band)}
                      className="rounded bg-red-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
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

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 text-left shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.createBand}
            </h3>

            <div className="space-y-3">
              <label className="block">
                <span className="font-medium">{messages.name}</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.bandLeaderLabel}</span>
                <select
                  value={bandLeaderId}
                  onChange={(event) => setBandLeaderId(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                      {user.email ? ` (${user.email})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-medium">{messages.description}</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.contactEmail}</span>
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.contactTel}</span>
                <input
                  value={contactTel}
                  onChange={(event) => setContactTel(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.websiteUrl}</span>
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.genres}</span>
                <input
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                  placeholder="jazz, funk, soul"
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
            </div>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.undoChanges}
              </button>

              <button
                type="button"
                onClick={confirmCreate}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 text-left shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.editBand}: {editingBand.name}
            </h3>

            <div className="space-y-3">
              <label className="block">
                <span className="font-medium">{messages.name}</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.bandLeaderLabel}</span>
                <select
                  value={bandLeaderId}
                  onChange={(event) => setBandLeaderId(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                      {user.email ? ` (${user.email})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-medium">{messages.description}</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.contactEmail}</span>
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.contactTel}</span>
                <input
                  value={contactTel}
                  onChange={(event) => setContactTel(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.websiteUrl}</span>
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  className="mt-1 w-full rounded border p-2"
                />
              </label>

              <label className="block">
                <span className="font-medium">{messages.genres}</span>
                <input
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                  placeholder="jazz, funk, soul"
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
            </div>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingBand(null);
                  setError(null);
                }}
                className="rounded bg-gray-300 px-4 py-2"
              >
                {messages.undoChanges}
              </button>

              <button
                type="button"
                onClick={confirmEdit}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                {messages.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingBand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 text-left shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.delete}: {deletingBand.name}?
            </h3>

            <p>{messages.deleteWarning}</p>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingBand(null)}
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
