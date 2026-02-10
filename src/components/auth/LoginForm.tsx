"use client";
import { useState } from "react";


interface LoginFormProps {
  locale: string;
  messages: any;
  onSuccess?: () => void;
}

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

export default function LoginForm({ locale, messages, onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost/api";

  async function fetchCsrfToken() {
    await fetch("/api/auth/csrf/", {
      method: 'GET',
      credentials: 'include',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetchCsrfToken(); // ensure csrftoken cookie exists
      const csrftoken = getCookie('csrftoken');

      const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);


      const response = await fetch(
        `${API_BASE}/api/auth/login/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": csrftoken ?? "",
          },
          body: formData.toString(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();
      console.log("Logged in as:", data.username);

      onSuccess?.();
    } catch (err) {
      console.error("Login error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error during login");
      }
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
