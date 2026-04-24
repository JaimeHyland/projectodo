"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";

interface SignupFormProps {
  locale: string;
  messages: SignupMessages;
  onSuccess?: () => void;
}

interface SignupMessages {
  signup: {
    labelUsername: string;
    labelFirstName: string;
    labelLastName: string;
    labelEmail: string;
    labelConfirmEmail: string;
    buttonSubmit: string;
    buttonSubmitting?: string;
    messageSignupFailed: string;
    messageSignupSuccess: string;
    messageEmailMismatch: string;
    messageEmailValid: string;
    messageInvalidEmail: string;
    messageRequiredFields: string;
    messageNetworkError: string;
    noteRequiredFields: string;
  };
}

export default function SignupForm({
  locale,
  messages,
  onSuccess,
}: SignupFormProps) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim();
  const normalizedEmailConfirm = emailConfirm.trim();

  const emailsMatch =
    !!normalizedEmail &&
    !!normalizedEmailConfirm &&
    normalizedEmail === normalizedEmailConfirm;

  const emailsAreValid =
    isValidEmail(normalizedEmail) && isValidEmail(normalizedEmailConfirm);

  const emailsReady = emailsMatch && emailsAreValid;
  const canSubmit = !loading && emailsReady && !!normalizedUsername;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (!normalizedUsername || !normalizedEmail || !normalizedEmailConfirm) {
      setError(messages.signup.messageRequiredFields);
      setLoading(false);
      return;
    }

    if (!emailsAreValid) {
      setError(messages.signup.messageInvalidEmail);
      setLoading(false);
      return;
    }

    if (!emailsMatch) {
      setError(messages.signup.messageEmailMismatch);
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

      const response = await fetch(apiUrl("auth/signup/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          username: normalizedUsername,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
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
        setError(data.error || messages.signup.messageSignupFailed);
        setLoading(false);
        return;
      }

      setSuccessMessage(data.message || messages.signup.messageSignupSuccess);
      onSuccess?.();
    } catch {
      setError(messages.signup.messageNetworkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-center">{error}</div>}
      {successMessage && (
        <div className="text-green-600 text-center">{successMessage}</div>
      )}

      <div>
        <label className="block mb-1">{messages.signup.labelUsername} *</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          autoComplete="username"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block mb-1">{messages.signup.labelFirstName}</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={loading}
          autoComplete="given-name"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block mb-1">{messages.signup.labelLastName}</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={loading}
          autoComplete="family-name"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block mb-1">{messages.signup.labelEmail} *</label>
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
          {messages.signup.labelConfirmEmail} *
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
              ? messages.signup.messageEmailValid
              : messages.signup.messageEmailMismatch}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-2 rounded text-white ${
          canSubmit ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"
        }`}
      >
        {loading
          ? messages.signup.buttonSubmitting
          : messages.signup.buttonSubmit
          }
      </button>

      <p className="text-xs text-gray-500 text-center">
        {messages.signup.noteRequiredFields}
      </p>
    </form>
  );
}
