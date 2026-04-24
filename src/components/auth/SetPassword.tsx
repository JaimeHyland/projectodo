"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";

interface SetPasswordProps {
  token: string;
  username?: string;
  locale: string;
  messages: SetPasswordMessages;
  onSuccess?: (data?: any) => void;
  onClose?: () => void;
}

interface SetPasswordMessages {
  setPassword: {
    labelTitle: string;
    labelSuccess: string;
    messageSuccess: string;
    messageSettingPasswordFor: string;
    messageMissingToken: string;
    messageRequiredFields: string;
    messagePasswordMismatch: string;
    messageSetPasswordFailed: string;
    messageErrorLoginFailed: string;
    messageNetworkError: string;
    labelPassword: string;
    labelConfirmPassword: string;
    labelAutoLogin: string;
    buttonSubmit: string;
    buttonSubmitting: string;
    buttonContinue: string;
  };
}

export default function SetPassword({
  token,
  username,
  locale,
  messages,
  onSuccess,
  onClose,
}: SetPasswordProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);
  const [autoLogin, setAutoLogin] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch =
    !!password && !!passwordConfirm && password === passwordConfirm;

  const canSubmit = !loading && !!token && passwordsMatch;

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
      setError(messages.setPassword.messageMissingToken);
      setLoading(false);
      return;
    }

    if (!password || !passwordConfirm) {
      setError(messages.setPassword.messageRequiredFields);
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setError(messages.setPassword.messagePasswordMismatch);
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

      const response = await fetch(apiUrl("auth/set_password/"), {
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
        setError(data.error || messages.setPassword.messageSetPasswordFailed);
        setLoading(false);
        return;
      }

      setCreatedUsername(data.username || username || null);
      setStep("success");
      onSuccess?.(data);
    } catch {
      setError(messages.setPassword.messageNetworkError);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!autoLogin || !createdUsername) {
      onClose?.();
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

      const response = await fetch(apiUrl("auth/login/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          username: createdUsername,
          password,
        }),
      });

      if (!response.ok) {
        setError(messages.setPassword.messageErrorLoginFailed);
        return;
      }

      onClose?.();
    } catch {
      setError(messages.setPassword.messageNetworkError);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {messages.setPassword.labelSuccess}
        </h2>

        <p className="text-center text-gray-700">
          {messages.setPassword.messageSuccess}
        </p>

        <label className="flex items-center gap-2 text-sm justify-center">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
          />
          {messages.setPassword.labelAutoLogin}
        </label>

        {error && <div className="text-red-600 text-center">{error}</div>}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-2 rounded text-white bg-green-600 hover:bg-green-700"
        >
          {messages.setPassword.buttonContinue}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderError()}

      <h2 className="text-xl font-semibold text-center">
        {messages.setPassword.labelTitle}
      </h2>

      {username && (
        <div className="text-sm text-gray-600 text-center">
          {messages.setPassword.messageSettingPasswordFor}{" "}
          <span className="font-semibold">{username}</span>
        </div>
      )}

      <div>
        <label className="block mb-1">
          {messages.setPassword.labelPassword} *
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
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

      <div>
        <label className="block mb-1">
          {messages.setPassword.labelConfirmPassword} *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            className="w-full border px-3 py-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {showConfirmPassword ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-2 rounded text-white ${
          canSubmit ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"
        }`}
      >
        {loading
          ? messages.setPassword.buttonSubmitting
          : messages.setPassword.buttonSubmit}
      </button>
    </form>
  );
}
