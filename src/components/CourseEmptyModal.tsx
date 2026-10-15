"use client";

import { useEffect, useId, useRef } from "react";
import type { CourseLabels } from "@/lib/public-courses";

export function CourseEmptyModal({ labels, filtered, onClose }: {
  labels: CourseLabels; filtered: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = useId();
  const description = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby={title} aria-describedby={description}
      className="w-[calc(100%_-_2rem)] max-w-lg rounded-lg bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/60"
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          closeButton.current?.focus();
        }
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 id={title} className="text-xl font-bold">{labels.title}</h2>
      <p id={description} className="mt-3 text-gray-700">{filtered ? labels.emptyLocation : labels.emptyAll}</p>
      <div className="mt-6 flex justify-end">
        <button ref={closeButton} type="button" autoFocus onClick={onClose}
          className="rounded bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          {labels.close}
        </button>
      </div>
    </dialog>
  );
}
