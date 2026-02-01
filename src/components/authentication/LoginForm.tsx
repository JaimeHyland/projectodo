"use client";
import { useState } from "react";


interface LoginFormProps {
  locale: string;
  messages: any;
  onSuccess?: () => void;
}


export default function LoginForm({ locale, messages, onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login/`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!response.ok) throw new Error("Login failed");

      onSuccess?.();
    } catch (err) {
      setError(messages.login.textError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-center">{error}</div>}

      <div>
        <label className="block mb-1">{messages.login.labelUsername}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block mb-1">{messages.login.labelPassword}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {messages.login.buttonSubmit}
      </button>
    </form>
  );
}
