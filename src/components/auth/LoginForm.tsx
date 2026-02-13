"use client";
import { apiUrl } from "@/lib/api";
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

  const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(';').shift() : undefined;
};


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("DEBUG - ---- LOGIN ATTEMPT START ----");
      console.log("Username:", username);

      console.log("DEBUG - Fetching CSRF token...");
      const csrfResponse = await fetch(apiUrl("auth/csrf/"), { method: "GET", credentials: "include" });
      console.log("DEBUG - CSRF response status:", csrfResponse.status);
      console.log("DEBUG - document.cookie AFTER csrf fetch:", document.cookie);
      
      const csrftoken = getCookie('csrftoken');
      console.log("DEBUG - Extracted csrftoken:", csrftoken);

      const formData = new URLSearchParams({ username, password });

      console.log("DEBUG - Sending login POST...");
      const response = await fetch(apiUrl("auth/login/"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken ?? "",
        },
        body: JSON.stringify({ username, password }),
      });
      console.log("DEBUG - Login response status:", response.status);
      console.log("DEBUG - Login response headers:", [...response.headers.entries()]);

      let data: any = null;

      try {
        data = await response.json();
        console.log("DEBUG - Login response was valid JSON:", data);
      } catch {
        // if response is not JSON
        console.log("DEBUG - Login response was NOT JSON");
        data = null;
      }

      if (!response.ok) {
        const errorMsg = data?.error || `Login failed (${response.status})`;
        throw new Error(errorMsg);
      }

      console.log("Logged in as:", data?.username ?? "unknown");
      console.log("DEBUG - document.cookie AFTER login:", document.cookie);
      console.log("DEBUG - ---- LOGIN ATTEMPT SUCCESS ----");

      onSuccess?.();
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error during login");
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

