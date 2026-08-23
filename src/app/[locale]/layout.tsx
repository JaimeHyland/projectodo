import '../globals.css';
import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body className="flex min-h-screen min-h-dvh flex-col">
        <Header />
        <main className="grow">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
