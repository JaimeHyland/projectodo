"use client";

import { useState } from "react";

interface ResetPasswordConfirmProps {
  token: string;
  username?: string;
  locale: string;
  messages: ResetPasswordConfirmMessages;
  onSuccess?: (data?: any) => void;
  onClose?: () => void;
}

interface ResetPasswordConfirmMessages {
  resetPasswordConfirm: {
    labelTitle: string;
    titleSuccess: string;
    textSuccess: string;
    textResettingPasswordFor: string;
    textMissingToken: string;
    textRequiredFields: string;
    textPasswordMismatch: string;
    textResetPasswordFailed: string;
    textErrorLoginFailed: string;
    textNetworkError: string;
    labelPassword: string;
    labelConfirmPassword: string;
    labelAutoLogin: string;
    buttonSubmit: string;
    buttonSubmitting: string;
    buttonContinue: string;
  };
}

export default function ResetPasswordConfirm({
  token,
  username,
  locale,
  messages,
  onSuccess,
  onClose,
}: ResetPasswordConfirmProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [autoLogin, setAutoLogin] = useState(true);

  const renderError = () => {
    if (!error) return null;

    if (Array.isArray(error)) {
      return (
        <div className="text-red-600 text-center space-y-1">
          {error.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      );
    }

    return <div className="text-red-600 text-center">{error}</div>;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!token) {
      setError(messages.resetPasswordConfirm.textMissingToken);
      setLoading(false);
      return;
    }

    if (!password || !passwordConfirm) {
      setError(messages.resetPasswordConfirm.textRequiredFields);
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setError(messages.resetPasswordConfirm.textPasswordMismatch);
      setLoading(false);
      return;
    }

    try {
      const csrfRes = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch("/api/auth/set_password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
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
        setError(
          data.error || messages.resetPasswordConfirm.textResetPasswordFailed
        );
        setLoading(false);
        return;
      }

      setResolvedUsername(data.username || username || null);
      setStep("success");
      onSuccess?.(data);
    } catch (err) {
      console.error("Set/reset password submit failed:", err);
      setError(messages.resetPasswordConfirm.textNetworkError + " " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!autoLogin || !resolvedUsername) {
      onClose?.();
      return;
    }

    try {
      const csrfRes = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          username: resolvedUsername,
          password,
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
        setError(messages.resetPasswordConfirm.textErrorLoginFailed);
        return;
      }

      onClose?.();
    } catch {
      setError(messages.resetPasswordConfirm.textNetworkError);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {messages.resetPasswordConfirm.titleSuccess}
        </h2>

        <p className="text-center text-gray-700">
          {messages.resetPasswordConfirm.textSuccess}
        </p>

        <label className="flex items-center gap-2 text-sm justify-center">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
          />
          {messages.resetPasswordConfirm.labelAutoLogin}
        </label>

        {error && <div className="text-red-600 text-center">{error}</div>}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-2 rounded text-white bg-green-600 hover:bg-green-700"
        >
          {messages.resetPasswordConfirm.buttonContinue}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderError()}

      <h2 className="text-xl font-semibold text-center">
        {messages.resetPasswordConfirm.labelTitle}
      </h2>

      {username && (
        <div className="text-sm text-gray-600 text-center">
          {messages.resetPasswordConfirm.textResettingPasswordFor}{" "}
          <span className="font-semibold">{username}</span>
        </div>
      )}

      <div>
        <label className="block mb-1">
          {messages.resetPasswordConfirm.labelPassword} *
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block mb-1">
          {messages.resetPasswordConfirm.labelConfirmPassword} *
        </label>
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 rounded text-white ${
          loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading
          ? messages.resetPasswordConfirm.buttonSubmitting
          : messages.resetPasswordConfirm.buttonSubmit}
      </button>
    </form>
  );
}