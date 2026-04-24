"use client";

import { apiUrl } from "@/lib/api";
import { on } from "events";
import { useState } from "react";

interface ResetPasswordMessages {
  resetPassword: {
    labelTitle: string;
    labelDescription: string;
    labelEmail: string;
    labelConfirmEmail: string;
    buttonSubmitting: string;
    buttonSubmit: string;
    messageInvalidEmail: string;
    messageEmailValid: string;
    messageEmailMismatch: string;
    messageRequiredFields: string;
    messageResetFailed: string;
    labelSuccess: string;
    messageResetSuccess: string;
    buttonClose: string;
    messageUnknownError: string;
    noteRequiredFields: string;
  };
}

interface ResetPasswordFormProps {
  locale: string;
  messages: ResetPasswordMessages;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ResetPasswordForm({
  locale,
  messages,
  onSuccess,
  onClose,
}: ResetPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const normalizedEmail = email.trim();
  const normalizedEmailConfirm = emailConfirm.trim();

  const emailsMatch =
    !!normalizedEmail &&
    !!normalizedEmailConfirm &&
    normalizedEmail === normalizedEmailConfirm;

  const emailsAreValid =
    isValidEmail(normalizedEmail) && isValidEmail(normalizedEmailConfirm);

  const emailsReady = emailsMatch && emailsAreValid;
  const canSubmit = !loading && emailsReady;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!normalizedEmail || !normalizedEmailConfirm) {
      setError(messages.resetPassword.messageRequiredFields);
      setLoading(false);
      return;
    }

    if (!emailsAreValid) {
      setError(messages.resetPassword.messageInvalidEmail);
      setLoading(false);
      return;
    }

    if (!emailsMatch) {
      setError(messages.resetPassword.messageEmailMismatch);
      setLoading(false);
      return;
    }

    try {
      const csrfRes = await fetch(apiUrl("auth/csrf/"), {
        credentials: "include",
        headers: {
          "Accept-Language": locale,
        },
      });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch(apiUrl("auth/request_password_reset/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
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

      if (!response.ok) {
        setError(data.error || messages.resetPassword.messageResetFailed);
        setLoading(false);
        return;
      }

      setEmail("");
      setEmailConfirm("");
      setStep("success");
    } catch {
      setError(messages.resetPassword.messageUnknownError);
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {messages.resetPassword.labelSuccess}
        </h2>

        <p className="text-center text-gray-700">
          {messages.resetPassword.messageResetSuccess}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded text-white bg-orange-600 hover:bg-orange-700"
        >
          {messages.resetPassword.buttonClose}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-center">
        {messages.resetPassword.labelTitle}
      </h2>

      <p>
        <em>{messages.resetPassword.labelDescription}</em>
      </p>

      {error && <div className="text-red-600 text-center">{error}</div>}

      <div>
        <label className="block mb-1">
          {messages.resetPassword.labelEmail} *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
          disabled={loading}
          autoComplete="email"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />

        {email && emailConfirm && (
          <p
            className={`text-xs mt-1 ${
              emailsReady ? "text-green-600" : "text-red-600"
            }`}
          >
            {emailsReady
              ? messages.resetPassword.messageEmailValid
              : messages.resetPassword.messageInvalidEmail}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-2 rounded text-white ${
          canSubmit ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-400"
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
