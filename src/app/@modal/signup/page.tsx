"use client";

import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";



interface Messages {
  signup?: {
    labelTitle?: string;
    buttonSubmit?: string;
  }
}


interface SignupModalPageProps {
  params: { locale: string };
  onClose?: () => void;
  messages: Messages;
}

const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");

async function handleSignup(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setMessage("");

  try {
    const res = await fetch("/api/auth/signup/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
      }),
    });

    const data = await res.json();
    console.log("Signup response:", data);

    if (!res.ok) {
      setError(data.error || "Signup failed");
      return;
    }

    setMessage(data.message || "Verification email sent.");
  } catch (err) {
    console.error(err);
    setError("Network error");
  }
}

export default function SignupModalPage({
  params,
  onClose,
  messages,
}: SignupModalPageProps) {
  const locale = params?.locale ?? "en";

  return (
    <AuthModal onClose={onClose ?? (() => {})}>
      <h2 className="text-lg font-semibold mb-4">
        {messages.signup?.labelTitle ?? "Sign Up"}
      </h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {messages.signup?.buttonSubmit ?? "Sign Up"}
        </button>

        {message && (
          <p className="text-green-600 text-sm">{message}</p>
        )}

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
      </form>
    </AuthModal>
  );
}
