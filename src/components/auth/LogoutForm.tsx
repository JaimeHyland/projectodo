"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";


interface LogoutFormProps {
  locale: string;
  user: {username?: string } | null;
  messages: LogoutMessages;
  onConfirm?: () => void;
  onCancel: () => void;
}

interface LogoutMessages {
  logout: {
    labelTitle: string;
    labelUsername: string;
    textConfirm: string;
    buttonCancel: string;
    buttonSubmit: string;
    textUnknownUser: string;
    textErrorLogoutFailed: string;
  };
}

export default function LogoutForm({
  locale,
  user,
  messages,
  onConfirm,
  onCancel,
}: LogoutFormProps) {

  const [error, setError] = useState<string | null>(null);
  const displayName = user?.username || messages.logout.textUnknownUser;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await fetch(apiUrl("auth/csrf/"), {
        method: "GET",
        credentials: "include",
        headers: { "Accept-Language": locale },
      });
      const csrftoken = document.cookie
        .split("; ")
        .find(row => row.startsWith("csrftoken="))
        ?.split("=")[1];


      const response = await fetch(apiUrl("auth/logout/"), {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrftoken ?? "",
            "Accept-Language": locale,
          },
        });
        
        let data: any = null;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text.slice(0, 200));
        }

        if (!response.ok) {
          throw new Error(data.error || messages.logout.textErrorLogoutFailed);
        }

        onConfirm?.();
      } catch (err) {
        console.error("[logout] error:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(messages.logout.textErrorLogoutFailed);
        }
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
