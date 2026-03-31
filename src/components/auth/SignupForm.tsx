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
  const [message, setMessage] = useState<string | null>(null);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
  

    if (!username || !email || !emailConfirm) {
      setError(messages.signup.textRequiredFields);
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(messages.signup.textInvalidEmail);
      setLoading(false);
      return;
    }

    if (email !== emailConfirm) {
      setError(messages.signup.textEmailMismatch);
      setLoading(false);
      return;
    }

    try {
      const csrfRes = await fetch("/api/auth/csrf/");
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken;

      const response = await fetch("/api/auth/signup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale,
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ username, email }),
      });

      const data = await response.json();
      console.log("DEBUG - Signup response:", data);

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      alert(data.message || "Verification email sent!");
      onSuccess?.();

    } catch (err) {
      setError("Network error. Please try again." + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-center">{error}</div>}
      {message && <div className="text-green-600 text-center">{message}</div>}

      {/* Username */}
      <div>
        <label className="block mb-1">{messages.signup.labelUsername} *</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* First Name */}
      <div>
        <label className="block mb-1">{messages.signup.labelFirstName}</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Last Name */}
      <div>
        <label className="block mb-1">{messages.signup.labelLastName ?? "Last name"}</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block mb-1">{messages.signup.labelEmail ?? "Email"} *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Confirm Email */}
      <div>
        <label className="block mb-1">{messages.signup.labelConfirmEmail ?? "Repeat email"} *</label>
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
        className={`w-full py-2 rounded text-white ${
          loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {messages.signup.buttonSubmit}
      </button>

      <p className="text-xs text-gray-500 text-center">{messages.signup.noteRequiredFields}</p>
    </form>
  );
}