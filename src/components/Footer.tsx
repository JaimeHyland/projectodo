import Link from "next/link";

import en from "@/messages/footer/en.json";
import de from "@/messages/footer/de.json";
import es from "@/messages/footer/es.json";

interface FooterProps {
  locale: string;
}


export function Footer({ locale }: FooterProps) {
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <footer className="bg-gray-900 text-white p-4 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="space-x-4">
          <Link href={`/${locale}/legal-notice`} className="hover:underline">
            {messages.linkImpressum}
          </Link>
          <span>{messages.textCopyright}</span>
          <span>{messages.MITLicense}</span>
        </div>
        <button className="mt-2 sm:mt-0 bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
          {messages.btnManagePermissions}
        </button>
      </div>
    </footer>
  );
}
