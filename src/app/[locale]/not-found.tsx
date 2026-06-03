// src/app/[locale]/not-found.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import enMessages from '@/messages/not-found/en.json';
import deMessages from '@/messages/not-found/de.json';
import esMessages from '@/messages/not-found/es.json';

export default function NotFound() {
  const pathname = usePathname();

  const locale =
    pathname?.startsWith('/de') ? 'de' :
    pathname?.startsWith('/es') ? 'es' :
    'en';

  const messages =
    locale === 'de' ? deMessages :
    locale === 'es' ? esMessages :
    enMessages;

  const homeHref = locale === 'en' ? '/' : `/${locale}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">{messages.title}</h1>

      <p className="mb-8">{messages.message}</p>

      <Link
        href={homeHref}
        className="inline-block rounded bg-[#3a5c03] px-4 py-2 text-white hover:opacity-90"
      >
        {messages.homeLink}
      </Link>
    </main>
  );
}
