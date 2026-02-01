"use client";

import AuthenticationModal from "@/components/authentication/AuthenticationModal";

export default function SignupModalPage({ onClose }: { onClose?: () => void }) {
  return (
    <AuthenticationModal onClose={onClose ?? (() => {})}>
      <h2 className="text-lg font-semibold mb-4">Sign Up</h2>
      {/* Signup form placeholder */}
    </AuthenticationModal>
  );
}
