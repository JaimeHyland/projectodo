"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";

interface LoginMessages {
  login: {
    labelUsername: string;
    labelPassword: string;
    buttonSubmit: string;
    buttonSubmitting: string;
    buttonForgottenPassword: string;
    messageErrorLoginFailed: string;
    messageErrorInvalidCredentials: string;
    messageErrorUnknown: string;
  };
}

interface LoginFormProps {
  locale: string;
  messages: LoginMessages;
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(";").shift() : undefined;
}

export default function LoginForm({
  locale,
  messages,
  onSuccess,
  onForgotPassword,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = !loading && !!username.trim() && !!password;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetch(apiUrl("auth/csrf/"), {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept-Language": locale,
        },
      });

      const csrftoken = getCookie("csrftoken");

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

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const apiError =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : null;

        if (response.status === 401) {
          throw new Error(messages.login.messageErrorInvalidCredentials);
        }

        throw new Error(apiError ?? messages.login.messageErrorLoginFailed);
      }

      onSuccess?.();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(messages.login.messageErrorUnknown);
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
        <label htmlFor="login-username" className="block mb-1">
          {messages.login.labelUsername}
        </label>
        <input
          type="text"
          id="login-username"
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
                .replace(/\s+/g, "")
            )
          }
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
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
            className="w-full border px-3 py-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-2 rounded text-white ${
          canSubmit ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"
        }`}
      >
        {loading ? messages.login.buttonSubmitting : messages.login.buttonSubmit}
      </button>

      <button
        type="button"
        onClick={onForgotPassword}
        disabled={loading}
        className="w-full text-sm text-blue-600 hover:underline disabled:opacity-50"
      >
        {messages.login.buttonForgottenPassword}
      </button>
    </form>
  );
}
