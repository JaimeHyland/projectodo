"use client";

import { useState } from "react";


interface ResetPasswordMessages {
  resetPassword: {
    labelTitle: string;
    labelEmail: string;
    labelConfirmEmail: string;
    buttonSubmitting: string;
    buttonSubmit: string;
    textInvalidEmailAddress: string;
    textEmailMismatch: string;
    textRequiredFields: string;
    textResetFailed: string;
    textResetSuccess: string;
    textUnknownError: string;
    noteRequiredFields: string;
  };
}

interface ResetPasswordFormProps {
  locale: string;
  messages: ResetPasswordMessages;
  onSuccess?: () => void;
}

export default function ResetPasswordForm({
  locale,
  messages,
  onSuccess,
}: ResetPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email || !emailConfirm) {
      setError(messages.resetPassword.textRequiredFields);
      setLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError(messages.resetPassword.textInvalidEmailAddress);
      setLoading(false);
      return;
    }

    if (email !== emailConfirm) {
      setError(messages.resetPassword.textEmailMismatch);
      setLoading(false);
      return;
    }

    try {
      const csrfRes = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch("/api/auth/request_password_reset/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text.slice(0, 200));
      }

      console.log("DEBUG -- request_password_reset response:", response.status, data);

      if (!response.ok) {
        setError(data.error || messages.resetPassword.textResetFailed);
        setLoading(false);
        return;
      }

      setMessage(data.message || messages.resetPassword.textResetSuccess);
      setEmail("");
      setEmailConfirm("");
    } catch (err) {
      console.error("DEBUG -- Password reset request failed:", err);
      setError(messages.resetPassword.textUnknownError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-center">
        {messages.resetPassword.labelTitle}
      </h2>

      {error && <div className="text-red-600 text-center">{error}</div>}
      {message && <div className="text-green-600 text-center">{message}</div>}

      <div>
        <label className="block mb-1">
          {messages.resetPassword.labelEmail} *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block mb-1">
          {messages.resetPassword.labelConfirmEmail} *
        </label>
        <input
          type="email"
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          required
          autoComplete="email"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 rounded text-white ${
          loading ? "bg-gray-400" : "bg-orange-600 hover:bg-orange-700"
        }`}
      >
        {loading
          ? messages.resetPassword.buttonSubmitting
          : messages.resetPassword.buttonSubmit}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {messages.resetPassword.noteRequiredFields}
      </p>
    </form>
  );
}