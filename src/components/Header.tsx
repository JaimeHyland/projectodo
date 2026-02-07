'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { HeaderLink } from './HeaderLink';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCurrentLocale, switchLocale, SUPPORTED_LOCALES } from "@/lib/locale";

import enHeaderMessages from "@/messages/header/en.json";
import deHeaderMessages from "@/messages/header/de.json";
import esHeaderMessages from "@/messages/header/es.json";
import enAuthMessages from "@/messages/auth/en.json";
import deAuthMessages from "@/messages/auth/de.json";
import esAuthMessages from "@/messages/auth/es.json";
import AuthModal from '@/components/auth/AuthModal';
import LoginForm from "@/components/auth/LoginForm";
import LogoutForm from "@/components/auth/LogoutForm";


export function Header() {
  type AuthState = {
    isAuthenticated: boolean;
    username: string | null;
    isSuperuser: boolean;
  };

  type User = {
    username: string;
    isSuperuser: boolean;
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const currentLocale = getCurrentLocale(pathname);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost/api";

  const headerMessages = currentLocale === "de"
    ? deHeaderMessages
    : currentLocale === "es"
      ? esHeaderMessages
      : enHeaderMessages;

  const authMessages = currentLocale === "de"
    ? deAuthMessages
    : currentLocale === "es"
      ? esAuthMessages
      : enAuthMessages;

  
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

  const [user, setUser] = useState<User | null>(null);

  const authMenuItems = [
  { label: headerMessages.menuSignup, href: "/auth/signup" },
  { label: headerMessages.menuLogin, href: "/auth/login" },
  { label: headerMessages.menuReset, href: "/auth/reset" },
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

  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    isSuperuser: false,
  });

  useEffect(() => {
  if (searchParams.get("auth") === "login") {
    setShowLoginModal(true);
  }

  const fetchAuthStatus = async () => {
    try {
      const url = new URL("/api/auth/status/", window.location.origin);
      console.log("[fetchAuthStatus] Requesting URL:", url.toString());

      const response = await fetch(url.toString(), {
        credentials: "include", // send cookies
      });

      console.log("DEBUG - [fetchAuthStatus] Response status:", response.status);

      if (!response.ok) {
        console.warn("[fetchAuthStatus] Response not OK, setting user to null");
        setUser(null);
        return;
      }

      const data = await response.json();
      console.log("DEBUG - [fetchAuthStatus] Response JSON:", data);

      if (data.is_authenticated) {
        setUser({
          username: data.username,
          isSuperuser: data.is_superuser,
        });
      } else {
        setUser(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("[fetchAuthStatus] Error during fetch:", err.message, err);
      } else {
        console.error("[fetchAuthStatus] Error during fetch (non-Error):", err);
      }
      setUser(null);
    }
  };

  fetchAuthStatus();
}, [searchParams]);



  const openLogin = () => {
    setAuthMenuOpen(false);
    setShowLoginModal(true);
    console.log('DEBUG - Boo1');
    router.replace(`${pathname}?auth=login`);
  };

  const closeLogin = () => {
    setShowLoginModal(false);
    console.log('DEBUG - Boo2');
    router.replace(pathname);
  };

  const openLogout = () => {
    setAuthMenuOpen(false);
    setShowLogoutModal(true);
    console.log('DEBUG - Boo3');
    router.replace(`${pathname}?auth=logout`);
  };

  const closeLogout = () => {
    setShowLogoutModal(false);
    console.log('DEBUG - Boo4');
    router.replace(pathname);
  };

  return (
    <header className="relative">
      {/* Banner */}
      <div className="relative w-full">
        <div className="w-full relative">
          <picture>
            <source media="(max-width: 640px)" srcSet="/banner-4-1.jpg" />
            <source media="(max-width: 1024px)" srcSet="/banner-6-1.jpg" />
            <Image
              src="/banner-8-1.jpg"
              alt="Banner"
              priority
              width={3840}
              height={480}
              className="banner-image"
            />
          </picture>
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
            onClick={() => setAuthMenuOpen(prev => !prev)}
            className="px-3 py-2 rounded hover:bg-gray-300 font-medium text-gray-800"
          >
            {headerMessages.menuAuth}
          </button>

          {authMenuOpen && (
            <div className="absolute left-0 mt-2 w-36 bg-white border rounded shadow-md z-50">
              <ul className="flex flex-col">
                {!user && (
                  <li>
                    <button
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={openLogin}
                    >
                      {headerMessages.menuLogin}
                    </button>
                  </li>
                )}
                {user && (
                  <li>
                    <button
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={openLogout}
                    >
                      {headerMessages.menuLogout}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
          {showLoginModal && (
            <AuthModal onClose={closeLogin}>
              <LoginForm
                locale={currentLocale}
                messages={authMessages} 
                onSuccess={() => {
                  // Refresh login status
                  fetch(`${API_BASE}/api/auth/status/`, {
                    credentials: "include",
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.is_authenticated) {
                        setUser({
                          username: data.username,
                          isSuperuser: data.is_superuser
                        });
                      } else {
                        setUser(null);
                      }
                      closeLogin();
                    })
                    .catch(err => console.error(err));
                }}
              
              />
            </AuthModal>
          )}
          {showLogoutModal && (
            <AuthModal onClose={closeLogout}>
              <LogoutForm
                locale={currentLocale}
                user={user}
                messages={authMessages}
                onConfirm={() => {
                  setUser(null);
                  closeLogout();
              }}
              onCancel={closeLogout}/>
            </AuthModal>
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
