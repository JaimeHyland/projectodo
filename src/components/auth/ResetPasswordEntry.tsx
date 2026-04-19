"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import AuthModal from "./AuthModal";
import ResetPasswordConfirm from "./ResetPasswordConfirm";

interface ResetPasswordEntryProps {
  locale: string;
  messages: any;
}

export default function ResetPasswordEntry({
  locale,
  messages,
}: ResetPasswordEntryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const auth = searchParams.get("auth");
  const token = searchParams.get("token");
  const username = searchParams.get("username");

  const isOpen = auth === "reset-password-confirm" && !!token;

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("token");
    params.delete("username");

    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
  };

  if (!isOpen || !token) return null;

  if (!messages?.resetPasswordConfirm) {
    console.error("Missing resetPasswordConfirm messages:", messages);
    return null;
  }

  return (
    <AuthModal onClose={closeModal}>
      <ResetPasswordConfirm
        token={token}
        username={username ?? undefined}
        locale={locale}
        messages={messages}
        onClose={closeModal}
      />
    </AuthModal>
  );
}
