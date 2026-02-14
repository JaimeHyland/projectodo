"use client";

import { apiUrl } from "@/lib/api";


interface LogoutFormProps {
  locale: string;
  user: {username?: string } | null;
  messages: any;
  onConfirm?: () => void;
  onCancel: () => void;
}

export default function LogoutForm({
  locale,
  user,
  messages,
  onConfirm,
  onCancel,
}: LogoutFormProps) {
  const displayName = user?.username || messages.logout.textUnknownUser;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch(apiUrl("auth/csrf/"), {
        method: "GET",
        credentials: "include",
      });
      const csrftoken = document.cookie
        .split("; ")
        .find(row => row.startsWith("csrftoken="))
        ?.split("=")[1];


      const response = await fetch(apiUrl("auth/logout/"), {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRFToken": csrftoken ?? "" },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || messages.logout.textLogoutFailed);
        }

        onConfirm?.();
      } catch (err) {
        console.error("Logout error:", err);
      }
    }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <h2 className="text-lg font-semibold text-center">
        {messages.logout.labelTitle}
      </h2>

      {/* User info */}
      <div className="text-center">
        <div className="text-sm text-gray-600">
          {messages.logout.labelUsername}
        </div>
        <div className="font-medium">{displayName}</div>
      </div>

      {/* Confirmation text */}
      <p className="text-center text-gray-700">
        {messages.logout.textConfirm}
      </p>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
        >
          {messages.logout.buttonCancel}
        </button>

        <button
          type="submit"
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          {messages.logout.buttonSubmit}
        </button>
      </div>
    </form>
  );
}
