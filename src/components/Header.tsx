'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { HeaderLink } from './HeaderLink';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCurrentLocale, switchLocale, SUPPORTED_LOCALES } from "@/lib/locale";



import enHeaderMessages from "@/messages/header/en.json";
import deHeaderMessages from "@/messages/header/de.json";
import esHeaderMessages from "@/messages/header/es.json";
import enAuthenticationMessages from "@/messages/authentication/en.json";
import deAuthenticationMessages from "@/messages/authentication/de.json";
import esAuthenticationMessages from "@/messages/authentication/es.json";
import AuthenticationModal from '@/components/authentication/AuthenticationModal';
import LoginForm from "@/components/authentication/LoginForm";


export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticationMenuOpen, setAuthenticationMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const currentLocale = getCurrentLocale(pathname);

  const headerMessages = currentLocale === "de"
  ? deHeaderMessages
  : currentLocale === "es"
    ? esHeaderMessages
    : enHeaderMessages;

    const authenticationMessages = currentLocale === "de"
  ? deAuthenticationMessages
  : currentLocale === "es"
    ? esAuthenticationMessages
    : enAuthenticationMessages;

  
  const menuItems = [
    { label: headerMessages.menuHome, href: "/" },
    { label: headerMessages.menuLessons, href: "/lessons" },
    { label: headerMessages.menuBands, href: "/bands" },
    { label: headerMessages.menuTechnical, href: "/technical" },
    { label: headerMessages.menuProduction, href: "/production" },
    { label: headerMessages.menuNews, href: "/news" },
    { label: headerMessages.menuPress, href: "/press" },
    { label: headerMessages.menuGuestbook, href: "/guestbook" },
    { label: headerMessages.menuContact, href: "/contact" },
  ];

  const authenticationMenuItems = [
  { label: headerMessages.menuSignup, href: "/authentication/signup" },
  { label: headerMessages.menuLogin, href: "/authentication/login" },
  { label: headerMessages.menuReset, href: "/authentication/reset" },
];

  const downloadSubmenu = ['Download 1', 'Download 2', 'Download 3'];

  // Example pastel/intense colors
  const tabColors = [
    '#2e744b',
    '#fabe00',
    '#7bae37',
    '#008bae',
    '#ca8f81',
    '#fabe00',
    '#3a5c03',
    '#f2f3ae',
    '#fabe00',
    '#008bae',
  ];

  useEffect(() => {
    if (searchParams.get("auth") === "login") {
      setShowLoginModal(true);
    }
  }, [searchParams]);

  const openLogin = () => {
    setAuthenticationMenuOpen(false);
    setShowLoginModal(true);
    router.replace(`${pathname}?auth=login`); // App Router compatible
  };

  const closeLogin = () => {
    setShowLoginModal(false);
    router.replace(pathname); // remove ?auth=login suffix
  };

  return (
    <header className="relative">
      {/* Banner */}
      <div className="relative w-full">
        <div className="w-full relative">
          <Image
            src="/banner.jpg"
            alt="Banner"
            loading="eager"
            width={3840}
            height={960}
            className="object w-full h-auto"
          />
        </div>

        {/* Language list overlay */}
        <ul className="absolute top-2 right-2 bg-white bg-opacity-70 p-2 rounded space-y-1 text-sm">
          {SUPPORTED_LOCALES.map((locale) => (
            <li key={locale}>
              <button 
                onClick={() => router.push(switchLocale(pathname, locale))}
                className={`
                  text-[#3a5c03]
                  ${currentLocale === locale ? "font-bold" : ""}
                  `}
              >
                {locale === "en" ? headerMessages.localeEn : locale === "de" ? headerMessages.localeDe : headerMessages.localeEs}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Navbar */}
      <nav className="bg-gray-200 relative">
        <div className="relative">
          <button
            onClick={openLogin}
            className="px-3 py-2 rounded hover:bg-gray-300 font-medium text-gray-800"
          >
            {headerMessages.menuAuthentication}
          </button>

          {authenticationMenuOpen && (
            <div className="absolute left-0 mt-2 w-36 bg-white border rounded shadow-md z-50">
              <ul className="flex flex-col">
                <li>
                  <button
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => {
                      
                      setShowLoginModal(true);
                      router.replace(`${pathname}?auth=login`);
                    }}
                  >
                    {headerMessages.menuLogin}
                  </button>
                </li>
                {/* {authenticationMenuItems.map((item) => (
                  <li key={item.href}>
                    <button
                      className="block px-4 py-2 hover:bg-gray-100"
                        onClick={() => {
                          setAuthenticationMenuOpen(false);
                          setShowLoginModal(true);
                        }}
                    >
                      {item.label}
                    </button>
                    {showLoginModal && (
                      <LoginLayout onClose={() => setShowLoginModal(false)} />
                    )}
                  </li>
                ))} */}
              </ul>
            </div>
          )}
          {showLoginModal && (
            <AuthenticationModal onClose={closeLogin}>
              <LoginForm locale={currentLocale} messages={authenticationMessages} />
            </AuthenticationModal>
          )}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-end desktop:justify-center h-16">
          {/* Hamburger for mobile */}
          <button
            className="desktop:hidden text-2xl px-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* Desktop/laptop navbar */}
          <ul className="hidden desktop:flex space-x-2">
            {menuItems.map((item, index) => (
              <li key={item.href}>
                <HeaderLink
                  href={item.href}
                  isActive={pathname === item.href}
                  style={{ backgroundColor: tabColors[index % tabColors.length] }}
                >
                  {item.label}
                </HeaderLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />

          <div 
          className="desktop:hidden absolute right-4 top-full mt-2 w-56 bg-white border shadow-lg rounded-lg p-2 flex flex-col gap-1 text-sm z-50">
            {menuItems.map((item, index) => (
              <HeaderLink
                key={item.href}
                href={item.href}
                isActive={pathname === item.href}
                className="w-full text-left rounded-md"
                style={{ backgroundColor: tabColors[index % tabColors.length] }}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </HeaderLink>
            ))}
          </div>
          </>
        )}
      </nav>
    </header>
  );
}
