"use client";

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
    titleSuccess: string;
    textSuccess: string;
    textSettingPasswordFor: string;
    textMissingToken: string;
    textRequiredFields: string;
    textPasswordMismatch: string;
    textSetPasswordFailed: string;
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
      setError(messages.setPassword.textMissingToken);
      setLoading(false);
      return;
    }

    if (!password || !passwordConfirm) {
      setError(messages.setPassword.textRequiredFields);
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setError(messages.setPassword.textPasswordMismatch);
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
        setError(data.error || messages.setPassword.textSetPasswordFailed);
        setLoading(false);
        return;
      }

      setCreatedUsername(data.username || username || null);
      setStep("success");
      onSuccess?.(data);
    } catch (err) {
      setError(messages.setPassword.textNetworkError);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue  = async () => {
    if (!autoLogin || !createdUsername) {
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
          username: createdUsername,
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
        setError(messages.setPassword.textErrorLoginFailed);
        return;
      }

      onClose?.();
    } catch (err) {
      setError(messages.setPassword.textNetworkError);
    };
  };
  
  if (step === "success") {
    return(
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {messages.setPassword.titleSuccess}
        </h2>

        <p className="text-center text-gray-700">
          {messages.setPassword.textSuccess}
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
          {messages.setPassword.textSettingPasswordFor}{" "}
          <span className="font-semibold">{username}</span>
        </div>
      )}

      <div>
        <label className="block mb-1">
          {messages.setPassword.labelPassword} *
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
          {messages.setPassword.labelConfirmPassword} *
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
          ? (messages.setPassword.buttonSubmitting)
          : (messages.setPassword.buttonSubmit)}
      </button>
    </form>
  );
}
