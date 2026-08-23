import Link from "next/link";
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa";
import { CopyrightDetailsButton } from "@/components/CopyrightDetailsButton";
import { MitLicenseDetailsButton } from "@/components/MitLicenseDetailsButton";

import en from "@/messages/footer/en.json";
import de from "@/messages/footer/de.json";
import es from "@/messages/footer/es.json";


interface FooterProps {
  locale: string;
}


export function Footer({ locale }: FooterProps) {
  const messages = locale === "de" ? de : locale === "es" ? es : en;

  return (
    <footer className="shrink-0 bg-gray-900 p-4 text-sm text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-4">
        {/* Legal and privacy */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <nav
            aria-label={messages.privacyAndLegalLabel}
            className="flex flex-wrap justify-center gap-x-4 gap-y-2 md:justify-start"
          >
            <Link
              href={`/${locale}/legal-notice`}
              className="font-medium underline underline-offset-4 hover:text-gray-200"
            >
              {messages.linkImpressum}
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className="font-medium underline underline-offset-4 hover:text-gray-200"
            >
              {messages.linkPrivacy}
            </Link>
          </nav>
        </div>

        {/* Centre */}
        <div className="flex justify-center gap-5">
          <a
            href="https://www.facebook.com/Projectodo/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.linkFacebook}
            title={messages.linkFacebook}
          >
            <FaFacebook className="h-6 w-6 hover:text-blue-500 transition-colors" />
          </a>

          <a
            href="https://www.instagram.com/projectodo.de/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.linkInstagram}
            title={messages.linkInstagram}
          >
            <FaInstagram className="h-6 w-6 hover:text-pink-500 transition-colors" />
          </a>

          <a
            href="https://www.youtube.com/@PROJECTODO"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.linkYoutube}
            title={messages.linkYoutube}
          >
            <FaYoutube className="h-6 w-6 hover:text-red-500 transition-colors" />
          </a>

                    <a
            href="https://www.tiktok.com/@projectodo5"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.linkTiktok}
            title={messages.linkTiktok}
          >
            <FaTiktok className="h-6 w-6 hover:text-red-500 transition-colors" />
          </a>
        </div>

        {/* Right */}
        <div className="flex flex-wrap justify-center gap-4 md:justify-end">
          <CopyrightDetailsButton
            copyright={messages.textCopyright}
            messages={messages.copyrightDetails}
          />
          <MitLicenseDetailsButton
            label={messages.MITLicense}
            messages={messages.mitLicenseDetails}
          />
        </div>
      </div>
    </footer>
  );
}
