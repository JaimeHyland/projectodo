"use client";

import { useEffect, useRef, useState } from "react";

type MitLicenseDetailsMessages = {
  title: string;
  permissions: string;
  attribution: string;
  warranty: string;
  repositoryLabel: string;
  repositoryLinkText: string;
  close: string;
};

interface MitLicenseDetailsButtonProps {
  label: string;
  messages: MitLicenseDetailsMessages;
}

const REPOSITORY_URL = "https://github.com/JaimeHyland/projectodo";

export function MitLicenseDetailsButton({
  label,
  messages,
}: MitLicenseDetailsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const closeModal = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="font-medium underline underline-offset-4 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {label}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mit-license-details-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 text-left text-gray-900 shadow-xl sm:p-6"
          >
            <h2 id="mit-license-details-title" className="text-xl font-bold">
              {messages.title}
            </h2>

            <div className="mt-3 space-y-3 text-gray-700">
              <p>{messages.permissions}</p>
              <p>{messages.attribution}</p>
              <p>{messages.warranty}</p>
            </div>

            <div className="mt-5">
              <p className="font-semibold">{messages.repositoryLabel}</p>
              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline"
              >
                {messages.repositoryLinkText}
              </a>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                ref={closeRef}
                type="button"
                onClick={closeModal}
                className="rounded bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                {messages.close}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
