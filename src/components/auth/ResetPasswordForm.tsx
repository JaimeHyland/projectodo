"use client";

import { useState } from "react";

interface ResetPasswordMessages {
  resetPassword: {
    labelTitle: string;
    labelUsername: string;
    labelEmail: string;
    labelNewPassword: string;
    labelConfirmNewPassword: string;
    buttonSubmit: string;
    textInvalidEmailAddress: string;
    textUnknownEmailAddress: string;
  };
}

interface ResetPasswordFormProps {
  locale: string;
  messages: ResetPasswordMessages;
  onSuccess?: () => void;
}

export default function ResetPasswordForm({ locale, messages, onSuccess }: ResetPasswordFormProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Dummy logic
    console.log("Password reset attempted for:", username);
    setTimeout(() => {
      setLoading(false);
      onSuccess?.();
      alert("Dummy reset submitted!");
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-center">{error}</div>}

      <div>
        <label className="block mb-1">{messages.resetPassword.labelUsername}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 disabled:opacity-50"
      >
        {messages.resetPassword.buttonSubmit}
      </button>
    </form>
  );
}
