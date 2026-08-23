// src/app/[locale]/not-found.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import enMessages from '@/messages/not-found/en.json';
import deMessages from '@/messages/not-found/de.json';
import esMessages from '@/messages/not-found/es.json';
import { ContentPanel, PageShell } from '@/components/PageShell';

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
    <PageShell title={messages.title} accent="gray" maxWidth="3xl">
      <ContentPanel className="text-center">
        <p className="mb-8 leading-7 text-[#514f4b]">{messages.message}</p>

        <Link
          href={homeHref}
          className="inline-flex rounded-full bg-[#3a5c03] px-5 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#304d03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3a5c03] focus-visible:ring-offset-2"
        >
          {messages.homeLink}
        </Link>
      </ContentPanel>
    </PageShell>
  );
}
