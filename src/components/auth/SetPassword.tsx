"use client";

import { useState } from "react";

interface SetPasswordProps {
  token: string;
  username?: string;
  locale: string;
  messages: any;
  onSuccess?: (data?: any) => void;
  onClose?: () => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!token) {
      setError(messages?.setPassword?.textMissingToken ?? "Missing token.");
      setLoading(false);
      return;
    }

    if (!password || !passwordConfirm) {
      setError(messages?.setPassword?.textRequiredFields ?? "Please complete all required fields.");
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setError(
        messages?.setPassword?.textPasswordMismatch ?? 
        "Passwords do not match."
      );
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
        setError(data.error || "Failed to set password.");
        setLoading(false);
        return;
      }

      setCreatedUsername(data.username || username || null);
      setStep("success");
      onSuccess?.(data);
    } catch (err) {
      setError("Network error. Please try again. " + err);
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
        setError(data.error || "Failed to log in.");
        return;
      }

      onClose?.();
    } catch (err) {
      setError("Network error. Please try again. " + err);
    };
  };
  
  if (step === "success") {
    return(
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          {messages?.setPassword?.titleSuccess ?? "Account created successfully"}
        </h2>

        <p className="text-center text-gray-700">
          {messages?.setPassword?.textSuccess ??
            "Your password has been set and your account is ready."}
        </p>

        <label className="flex items-center gap-2 text-sm justify-center">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
          />
          {messages?.setPassword?.labelAutoLogin ?? "Log me in now"}
        </label>

        {error && <div className="text-red-600 text-center">{error}</div>}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-2 rounded text-white bg-green-600 hover:bg-green-700"
        >
          {messages?.setPassword?.buttonContinue ?? "Continue"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderError()}

      <h2 className="text-xl font-semibold text-center">
        {messages?.setPassword?.title ?? "Set password"}
      </h2>

      {username && (
        <div className="text-sm text-gray-600 text-center">
          {messages?.setPassword?.textSettingPasswordFor ??
            "Setting password for"}{" "}
          <span className="font-semibold">{username}</span>
        </div>
      )}

      <div>
        <label className="block mb-1">
          {messages?.setPassword?.labelPassword ?? "Password"} *
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
          {messages?.setPassword?.labelConfirmPassword ?? "Repeat password"} *
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
          ? (messages?.setPassword?.buttonSubmitting ?? "Saving...")
          : (messages?.setPassword?.buttonSubmit ?? "Set password")}
      </button>
    </form>
  );
}
