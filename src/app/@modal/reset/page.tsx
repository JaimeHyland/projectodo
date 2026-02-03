"use client";

import AuthModal from "@/components/auth/AuthModal";

export default function ResetModalPage({ onClose }: { onClose?: () => void }) {
  return (
    <AuthModal onClose={onClose ?? (() => {})}>
      <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
      {/* Reset form placeholder */}
    </AuthModal>
  );
}
