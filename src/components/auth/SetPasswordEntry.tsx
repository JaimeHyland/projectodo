"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import AuthModal from "./AuthModal";
import SetPassword from "./SetPassword";

interface SetPasswordEntryProps {
  locale: string;
  messages: any;
}

export default function SetPasswordEntry({
  locale,
  messages,
}: SetPasswordEntryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const auth = searchParams.get("auth");
  const token = searchParams.get("token");
  const username = searchParams.get("username");

  const isOpen = auth === "set-password" && !!token;

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("token");
    params.delete("username");

    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
  };


  if (!isOpen || !token) return null;

  return (
    <AuthModal onClose={closeModal}>
      <SetPassword
        token={token}
        username={username ?? undefined}
        locale={locale}
        messages={messages}
        onClose={closeModal}
      />
    </AuthModal>
  );
}
