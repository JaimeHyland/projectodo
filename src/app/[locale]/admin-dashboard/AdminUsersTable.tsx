// src/app/[locale]/admin-dashboard/AdminUsersTable.tsx
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

type AdminUser = {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  is_current_user: boolean;
  groups: string[];
};

type Messages = {
  username: string;
  email: string;
  roles: string;
  actions: string;
  ordinary: string;
  superuserRole: string;
  edit: string;
  delete: string;
  confirm: string;
  undoChanges: string;
  editRolesFor: string;
  confirmDeleteUser: string;
  deleteWarning: string;
  couldNotUpdateUser: string;
  couldNotDeleteUser: string;
};

type Props = {
  users: AdminUser[];
  messages: Messages;
};

const availableGroups = [
  "webmaster",
  "press",
  "teacher",
  "student",
];

export default function AdminUsersTable({ users, messages }: Props) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setSelectedGroups(user.groups);
    setError(null);
  }


  function toggleGroup(group: string) {
    setSelectedGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group]
    );
  }

  async function confirmEdit() {
    if (!editingUser) return;

    const csrfToken = getCookie("csrftoken");
    console.log("CSRF Token:", csrfToken);

    const res = await fetch(apiUrl(`auth/users/${editingUser.id}/groups/`), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken ?? "",
      },
      body: JSON.stringify({ groups: selectedGroups }),
    });

    console.log("Edit response", res.status, res.statusText);

    if (!res.ok) {
      const text = await res.json();
      console.error("Edit failed", text);
      setError(text ?? "Could not update user.");
      return;
    }

    setEditingUser(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deletingUser) return;

    const csrfToken = getCookie("csrftoken");

    const res = await fetch(apiUrl(`auth/users/${deletingUser.id}/delete/`), {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRFToken": csrfToken ?? "",
      },
    });

    console.log("Delete response", res.status, res.statusText);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not delete user.");
      return;
    }

    setDeletingUser(null);
    router.refresh();
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2 text-left">{messages.username}</th>
              <th className="p-2 text-left">{messages.email}</th>
              <th className="p-2 text-left">{messages.roles}</th>
              <th className="p-2 text-left">{messages.actions}</th>
            </tr>
          </thead>

          <tbody>
            {users.map((adminUser) => {
              const isProtectedUser =
                adminUser.is_superuser || adminUser.is_current_user;

              return (
                <tr key={adminUser.id} className="border-b">
                  <td className="p-2">{adminUser.username}</td>
                  <td className="p-2">{adminUser.email || "—"}</td>
                  <td className="p-2">
                    {adminUser.is_superuser
                      ? ["superuser", ...adminUser.groups].join(", ")
                      : adminUser.groups.length > 0
                        ? adminUser.groups.join(", ")
                        : "ordinary"}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isProtectedUser}
                        onClick={() => openEdit(adminUser)}
                        className="rounded bg-gray-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={isProtectedUser}
                        onClick={() => setDeletingUser(adminUser)}
                        className="rounded bg-red-700 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {messages.editRolesFor.replace('{username}', editingUser.username)}
            </h3>

            <div className="space-y-2">
              {availableGroups.map((group) => (
                <label key={group} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group)}
                    onChange={() => toggleGroup(group)}
                  />
                  {group}
                </label>
              ))}
            </div>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded bg-gray-300 px-4 py-2"
              >
                Undo changes
              </button>

              <button
                type="button"
                onClick={confirmEdit}
                className="rounded bg-[#3a5c03] px-4 py-2 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              Delete {deletingUser.username}?
            </h3>

            <p>This cannot be undone.</p>

            {error && <p className="mt-4 text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded bg-gray-300 px-4 py-2"
              >
                Don't delete
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="rounded bg-red-700 px-4 py-2 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}