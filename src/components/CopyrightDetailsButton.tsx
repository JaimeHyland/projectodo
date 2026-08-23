"use client";

import { useEffect, useRef, useState } from "react";

type CopyrightDetailsMessages = {
  title: string;
  description: string;
  portfolioLabel: string;
  portfolioLinkText: string;
  emailLabel: string;
  close: string;
};

interface CopyrightDetailsButtonProps {
  copyright: string;
  messages: CopyrightDetailsMessages;
}

export function CopyrightDetailsButton({
  copyright,
  messages,
}: CopyrightDetailsButtonProps) {
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
        {copyright}
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
            aria-labelledby="copyright-details-title"
            className="w-full max-w-md rounded-lg bg-white p-5 text-left text-gray-900 shadow-xl sm:p-6"
          >
            <h2 id="copyright-details-title" className="text-xl font-bold">
              {messages.title}
            </h2>
            <p className="mt-2 text-gray-700">{messages.description}</p>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="font-semibold">{messages.portfolioLabel}</dt>
                <dd>
                  <a
                    href="https://www.jaime-hyland.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {messages.portfolioLinkText}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{messages.emailLabel}</dt>
                <dd>
                  <a
                    href="mailto:jaime.hyland@language-landscapes.com"
                    className="break-all underline"
                  >
                    jaime.hyland@language-landscapes.com
                  </a>
                </dd>
              </div>
            </dl>

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
