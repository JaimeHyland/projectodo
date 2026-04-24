"use client";

import { apiUrl } from "@/lib/api";
import { useState } from "react";

interface ChangePasswordFormProps {
  locale: string;
  messages: ChangePasswordMessages;
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

interface ChangePasswordMessages {
  changePassword: {
    labelTitle: string;
    labelOldPassword: string;
    buttonForgottenPassword: string;
    labelNewPassword: string;
    labelConfirmNewPassword: string;
    buttonSubmit: string;
    buttonSubmitting: string;
    messagePasswordMismatch: string;
    messageSuccess: string;
    textChangeFailed: string;
    messageNetworkError: string;
    messageRequiredFields: string;
    noteRequiredFields: string;
    textPasswordMatch: string;
    messagePasswordMismatchLive: string;
  };
}

export default function ChangePasswordForm({
  locale,
  messages,
  onSuccess,
  onForgotPassword,
}: ChangePasswordFormProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState<string | string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showPasswordMatchNote =
    newPassword.length > 0 && newPasswordConfirm.length > 0;

  const passwordsMatch =
    showPasswordMatchNote && newPassword === newPasswordConfirm;

  const canSubmit =
    !loading &&
    !!oldPassword &&
    !!newPassword &&
    !!newPasswordConfirm &&
    passwordsMatch;

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
    setMessage(null);
    setLoading(true);

    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      setError(messages.changePassword.messageRequiredFields);
      setLoading(false);
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError(messages.changePassword.messagePasswordMismatch);
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

      const response = await fetch(apiUrl("auth/change_password/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
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
        setError(data.error || messages.changePassword.textChangeFailed);
        setLoading(false);
        return;
      }

      setMessage(data.message || messages.changePassword.messageSuccess);
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");

      onSuccess?.();
    } catch {
      setError(messages.changePassword.messageNetworkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-center">
        {messages.changePassword.labelTitle}
      </h2>

      {renderError()}
      {message && <div className="text-green-600 text-center">{message}</div>}

      <div>
        <label className="block mb-1">
          {messages.changePassword.labelOldPassword} *
        </label>
        <div className="relative">
          <input
            type={showOldPassword ? "text" : "password"}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
            className="w-full border px-3 py-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowOldPassword((prev) => !prev)}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {showOldPassword ? "🙈" : "👁"}
          </button>
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {messages.changePassword.buttonForgottenPassword}
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-1">
          {messages.changePassword.labelNewPassword} *
        </label>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            className="w-full border px-3 py-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {showNewPassword ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      <div>
        <label className="block mb-1">
          {messages.changePassword.labelConfirmNewPassword} *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
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

      {showPasswordMatchNote && (
        <p
          className={`text-xs mt-1 ${
            passwordsMatch ? "text-green-600" : "text-red-600"
          }`}
        >
          {passwordsMatch
            ? messages.changePassword.textPasswordMatch
            : messages.changePassword.messagePasswordMismatchLive}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-2 rounded text-white ${
          canSubmit ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"
        }`}
      >
        {loading
          ? messages.changePassword.buttonSubmitting
          : messages.changePassword.buttonSubmit}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {messages.changePassword.noteRequiredFields}
      </p>
    </form>
  );
}
