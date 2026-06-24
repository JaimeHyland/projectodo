"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiUrl } from "@/lib/api";

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift()
    : undefined;
}

type BandPageData = {
  id: number;
  slug: string;
  description_html: string;
  foreground_colour: string;
  background_colour: string;
  published: boolean;
  band: {
    id: number;
    name: string;
  };
};

type BandWebpageBuilderProps = {
  locale: string;
  bandId: string;
  page: BandPageData | null;
};

export default function BandWebpageBuilder({
  locale,
  bandId,
  page,
}: BandWebpageBuilderProps) {
  const router = useRouter();

  const isEditMode = Boolean(page);

  const [descriptionHtml, setDescriptionHtml] = useState(
    page?.description_html ?? "",
  );
  const [published, setPublished] = useState(page?.published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const csrfToken = getCookie("csrftoken");

    const response = await fetch(
      isEditMode
        ? apiUrl(`bands/admin/bands/${bandId}/page/`)
        : apiUrl(`bands/admin/bands/${bandId}/page/create/`),
      {
        method: isEditMode ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken ?? "",
        },
        body: JSON.stringify({
          description_html: descriptionHtml,
          published,
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not save webpage.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/${locale}/admin-dashboard`);
    router.refresh();
  }

  function handleCancel() {
    router.push(`/${locale}/admin-dashboard`);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">
        {isEditMode ? "Edit webpage" : "Create webpage"}
      </h1>

      {page?.band?.name && (
        <p className="mb-4 text-sm text-gray-600">
          Band: {page.band.name}
        </p>
      )}

      <label className="mb-2 block font-medium">
        Page description
      </label>

      <textarea
        value={descriptionHtml}
        onChange={(event) => setDescriptionHtml(event.target.value)}
        rows={12}
        className="mb-4 w-full rounded-md border p-3"
        placeholder="Add the public webpage content here..."
      />

      <label className="mb-6 flex items-center gap-2">
        <input
          type="checkbox"
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
        />
        Published
      </label>

      {error && (
        <p className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded bg-[#3a5c03] px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : isEditMode
              ? "Save"
              : "Create"}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className="rounded bg-gray-300 px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}