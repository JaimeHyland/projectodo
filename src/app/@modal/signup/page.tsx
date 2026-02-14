"use client";

import AuthModal from "@/components/auth/AuthModal";
// import SignupForm from "@/components/auth/SignupForm";

interface SignupModalPageProps {
  params: { locale: string };
  onClose?: () => void;
  messages: any;
}

export default function SignupModalPage({
  params,
  onClose,
  messages,
}: SignupModalPageProps) {
  const locale = params?.locale ?? "en";

  return (
    <AuthModal onClose={onClose ?? (() => {})}>
      <h2 className="text-lg font-semibold mb-4">
        {messages.signup?.labelTitle ?? "Sign Up"}
      </h2>

      {/* Temporary placeholder until we build SignupForm */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Signup form placeholder (locale: {locale})
        </p>

        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          onClick={() => alert("Signup form coming soon")}
        >
          {messages.signup?.buttonSubmit ?? "Sign Up"}
        </button>
      </div>
    </AuthModal>
  );
}
