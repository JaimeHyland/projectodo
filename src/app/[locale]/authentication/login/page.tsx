"use client"

import LoginForm from "@/components/LoginForm";
import en from "@/messages/authentication/en.json";
import de from "@/messages/authentication/de.json";
import es from "@/messages/authentication/es.json";
import { useParams } from "next/navigation";

export default function LoginPage() {
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  const messages =
    locale === "de" ? de : locale === "es" ? es : en;

  return (
    <LoginForm
      locale={locale}
      messages={messages}
      onSuccess={() => {
        window.location.href = `/${locale}`;
      }}
    />
  );
}
