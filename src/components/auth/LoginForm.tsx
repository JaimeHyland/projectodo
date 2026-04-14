"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";

interface LoginMessages {
  login: {
    labelTitle: string;
    labelUsername: string;
    labelPassword: string;
    buttonSubmit: string;
    buttonSubmitting: string;
    textErrorLoginFailed: string,
    textErrorInvalidCredentials: string,
    textErrorUnknown: string;
  };
}

interface LoginFormProps {
  locale: string;
  messages: LoginMessages;
  onSuccess?: () => void;
}

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(';').shift() : undefined;
};


export default function LoginForm({ locale, messages, onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetch(apiUrl("auth/csrf/"), {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept-Language": locale
        },
      });
      
      const csrftoken = getCookie('csrftoken');

      const response = await fetch(apiUrl("auth/login/"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken ?? "",
          "Accept-Language": locale,
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const apiError = typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : null;

        if (response.status === 401) {
          throw new Error(messages.login.textErrorInvalidCredentials);
        }
        throw new Error(apiError ?? messages.login.textErrorLoginFailed);
      }

      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(messages.login.textErrorUnknown);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-600 text-center" role="alert">
          {error}
        </div>
      )}

      <div>
        <label  htmlFor="login-username" className="block mb-1">
          {messages.login.labelUsername}
        </label>
        <input
          type="text"
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          autoComplete="username"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block mb-1">
          {messages.login.labelPassword}
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? messages.login.buttonSubmitting : messages.login.buttonSubmit}
      </button>
   </form>
  );
}
