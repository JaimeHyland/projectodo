"use client";

import AuthenticationModal from "@/components/authentication/AuthenticationModal";

export default function ResetModalPage({ onClose }: { onClose?: () => void }) {
  return (
    <AuthenticationModal onClose={onClose ?? (() => {})}>
      <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
      {/* Reset form placeholder */}
    </AuthenticationModal>
  );
}
