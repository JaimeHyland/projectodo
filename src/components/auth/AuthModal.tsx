// src/components/authentication/AuthenticationModal.tsx
"use client";

import Modal from "../Modal";
import { ReactNode } from "react";

type AuthenticationModalProps = {
  onClose: () => void;
  children: ReactNode;
};

export default function AuthenticationModal({ onClose, children }: AuthenticationModalProps) {
  return (
    <Modal
      onClose={onClose}
      draggable
      resizable={false}
      maximizable={false}
      initialSize={{ width: "420px" }}
    >
      <div className="p-4 min-w-[300px]">
        {children}
      </div>
    </Modal>
  );
}
