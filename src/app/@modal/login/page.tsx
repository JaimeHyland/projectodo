"use client";

import AuthModal from "@/components/auth/AuthModal";

export default function SignupModalPage({ onClose }: { onClose?: () => void }) {
  return (
    <AuthModal onClose={onClose ?? (() => {})}>
      <h2 className="text-lg font-semibold mb-4">Sign Up</h2>
      {/* Signup form placeholder */}
    </AuthModal>
  );
}
