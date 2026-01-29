"use client";

import Modal from "@/components/Modal";
import { useRouter } from "next/navigation";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Modal
      onClose={() => router.back()}
      draggable
      resizable={false}
      maximizable={false}
      initialSize={{ width: "420px" }}
    >
      {children}
    </Modal>
  );
}
