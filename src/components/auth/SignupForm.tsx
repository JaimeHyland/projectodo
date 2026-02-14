"use client";

import { useState } from "react";

interface SignupFormProps {
  locale: string;
  messages: any;
  onSuccess?: () => void;
}

export default function SignupForm({ locale, messages, onSuccess }: SignupFormProps) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username || !email || !emailConfirm) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (email !== emailConfirm) {
      setError("Email addresses do not match.");
      setLoading(false);
      return;
    }

    // Dummy async simulation
    setTimeout(() => {
      setLoading(false);
      alert("Confirmation email sent (dummy logic).");
      onSuccess?.();
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-600 text-center">
          {error}
        </div>
      )}

      {/* Username (Required) */}
      <div>
        <label className="block mb-1">
          {messages.signup.labelUsername} *
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* First Name (Optional) */}
      <div>
        <label className="block mb-1">
          {messages.signup.labelFirstName ?? "First name"}
        </label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Last Name (Optional) */}
      <div>
        <label className="block mb-1">
          {messages.signup.labelLastName ?? "Last name"}
        </label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Email (Required) */}
      <div>
        <label className="block mb-1">
          {messages.signup.labelEmail ?? "Email"} *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Confirm Email (Required) */}
      <div>
        <label className="block mb-1">
          {messages.signup.labelConfirmEmail ?? "Repeat email"} *
        </label>
        <input
          type="email"
          value={emailConfirm}
          onChange={(e) => setEmailConfirm(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {messages.signup.buttonSubmit}
      </button>

      <p className="text-xs text-gray-500 text-center">
        * required fields
      </p>
    </form>
  );
}
