import Link from "next/link";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";

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
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-4">
        {/* Left */}
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
          <Link href={`/${locale}/legal-notice`} className="hover:underline">
            {messages.linkImpressum}
          </Link>
          <span>{messages.textCopyright}</span>
          <span>{messages.MITLicense}</span>
        </div>

        {/* Centre */}
        <div className="flex justify-center gap-5">
          <a
            href="https://www.facebook.com/Projectodo/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <FaFacebook className="h-6 w-6 hover:text-blue-500 transition-colors" />
          </a>

          <a
            href="https://www.instagram.com/projectodo.de/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <FaInstagram className="h-6 w-6 hover:text-pink-500 transition-colors" />
          </a>

          <a
            href="https://www.youtube.com/@PROJECTODO"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            <FaYoutube className="h-6 w-6 hover:text-red-500 transition-colors" />
          </a>
        </div>

        {/* Right */}
        <div className="flex justify-center md:justify-end">
          <button className="bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">
            {messages.btnManagePermissions}
          </button>
        </div>
      </div>
    </footer>
  );
}
