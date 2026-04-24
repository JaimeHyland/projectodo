"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";

interface LogoutFormProps {
  locale: string;
  user: { username?: string } | null;
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
    buttonSubmitting: string;
    textUnknownUser: string;
    messageErrorLogoutFailed: string;
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
  const [loading, setLoading] = useState(false);
  const displayName = user?.username || messages.logout.textUnknownUser;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetch(apiUrl("auth/csrf/"), {
        method: "GET",
        credentials: "include",
        headers: { "Accept-Language": locale },
      });

      const csrftoken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
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
        throw new Error(data.error || messages.logout.messageErrorLogoutFailed);
      }

      onConfirm?.();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(messages.logout.messageErrorLogoutFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold text-center">
        {messages.logout.labelTitle}
      </h2>

      {error && <div className="text-red-600 text-center">{error}</div>}

      <div className="text-center">
        <div className="text-sm text-gray-600">
          {messages.logout.labelUsername}
        </div>
        <div className="font-medium">{displayName}</div>
      </div>

      <p className="text-center text-gray-700">
        {messages.logout.textConfirm}
      </p>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
        >
          {messages.logout.buttonCancel}
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? messages.logout.buttonSubmitting : messages.logout.buttonSubmit}
        </button>
      </div>
    </form>
  );
}
