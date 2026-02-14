"use client";

import Modal from "../Modal";
import { ReactNode } from "react";

type AuthModalProps = {
  onClose: () => void;
  children: ReactNode;
};

export default function AuthModal({ onClose, children }: AuthModalProps) {
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
