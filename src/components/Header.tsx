'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { HeaderLink } from './HeaderLink';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getCurrentLocale, switchLocale, SUPPORTED_LOCALES } from '@/lib/locale';
import { apiUrl } from '@/lib/api';

import enHeaderMessages from '@/messages/header/en.json';
import deHeaderMessages from '@/messages/header/de.json';
import esHeaderMessages from '@/messages/header/es.json';
import enAuthMessages from '@/messages/auth/en.json';
import deAuthMessages from '@/messages/auth/de.json';
import esAuthMessages from '@/messages/auth/es.json';
import AuthModal from '@/components/auth/AuthModal';
import LoginForm from '@/components/auth/LoginForm';
import LogoutForm from '@/components/auth/LogoutForm';
import SignupForm from '@/components/auth/SignupForm';
import SetPasswordEntry from './auth/SetPasswordEntry';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import ResetPasswordEntry from "@/components/auth/ResetPasswordEntry";


export function Header() {

  type User = {
    username: string;
    isSuperuser: boolean;
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const localeMenuRef = useRef<HTMLDivElement | null>(null);

  const currentLocale = getCurrentLocale(pathname);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + "/api";

  const headerMessages =
    currentLocale === 'de'
      ? deHeaderMessages
      : currentLocale === 'es'
        ? esHeaderMessages
        : enHeaderMessages;

  const authMessages =
    currentLocale === 'de'
      ? deAuthMessages
      : currentLocale === 'es'
        ? esAuthMessages
        : enAuthMessages;

  const menuItems = [
    { label: headerMessages.menuHome, href: '/' },
    { label: headerMessages.menuLessons, href: '/lessons' },
    { label: headerMessages.menuBands, href: '/bands' },
    { label: headerMessages.menuTechnical, href: '/technical' },
    { label: headerMessages.menuProduction, href: '/production' },
    { label: headerMessages.menuNews, href: '/news' },
    { label: headerMessages.menuPress, href: '/press' },
    { label: headerMessages.menuGuestbook, href: '/guestbook' },
    { label: headerMessages.menuContact, href: '/contact' },
  ];

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
    const authParam = searchParams.get('auth');

    setShowLoginModal(authParam === 'login');
    setShowSignupModal(authParam === 'signup');
    setShowLogoutModal(authParam === 'logout');
    setShowChangePasswordModal(authParam === 'change_password');
    setShowResetPasswordModal(authParam === 'request_password_reset');

    const fetchAuthStatus = async () => {
      try {
        const response = await fetch(apiUrl('auth/status/'), {
          credentials: 'include',
        });

        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          console.warn('[fetchAuthStatus] Response not OK, setting user to null');
          setUser(null);
          return;
        }

        if (data?.is_authenticated) {
          setUser({
            username: data.username,
            isSuperuser: data.is_superuser,
          });
        } else {
          setUser(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error('[fetchAuthStatus] Error during fetch:', err.message, err);
        } else {
          console.error('[fetchAuthStatus] Error during fetch (non-Error):', err);
        }
        setUser(null);
      }
    };

    fetchAuthStatus();
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        localeMenuRef.current &&
        !localeMenuRef.current.contains(event.target as Node)
      ) {
        setLocaleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const openLogin = () => {
    setAuthMenuOpen(false);
    setShowLoginModal(true);
    router.replace(`${pathname}?auth=login`);
  };

  const closeLogin = () => {
    setShowLoginModal(false);
    router.replace(pathname);
  };

  const openSignup = () => {
    setAuthMenuOpen(false);
    setShowSignupModal(true);
    router.replace(`${pathname}?auth=signup`);
  };

  const closeSignup = () => {
    setShowSignupModal(false);
    router.replace(pathname);
  };

  const openLogout = () => {
    setAuthMenuOpen(false);
    setShowLogoutModal(true);
    router.replace(`${pathname}?auth=logout`);
  };

  const closeLogout = () => {
    setShowLogoutModal(false);
    router.replace(pathname);
  };

  const openChangePassword = () => {
    setAuthMenuOpen(false);
    setShowChangePasswordModal(true);
    router.replace(`${pathname}?auth=change_password`);
  };

  const closeChangePassword = () => {
    setShowChangePasswordModal(false);
    router.replace(pathname);
  };

    const openResetPassword = () => {
    setAuthMenuOpen(false);
    setShowResetPasswordModal(true);
    router.replace(`${pathname}?auth=request_password_reset`);
  };

  const closeResetPassword = () => {
    setShowResetPasswordModal(false);
    router.replace(pathname);
  };

  const switchToResetPassword = () => {
    setShowLoginModal(false);
    setShowChangePasswordModal(false);
    setShowSignupModal(false);
    setShowLogoutModal(false);
    setShowResetPasswordModal(true);
    router.replace(`${pathname}?auth=request_password_reset`);
  };

    // CHANGED: normalize pathname by removing locale prefix
  const pathWithoutLocale = (() => {
    const segments = pathname.split('/').filter(Boolean);

    if (
      segments.length > 0 &&
      typeof segments[0] === 'string' &&
      SUPPORTED_LOCALES.includes(segments[0])
    ) {
      const rest = segments.slice(1).join('/');
      return rest ? `/${rest}` : '/';
    }

    return pathname || '/';
  })();

  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathWithoutLocale === '/';
    }

    return (
      pathWithoutLocale === href ||
      pathWithoutLocale.startsWith(`${href}/`)
    );
  };

  const activeIndex = menuItems.findIndex((item) => isItemActive(item.href));

  const activeColor =
    activeIndex !== -1
      ? tabColors[activeIndex % tabColors.length]
      : 'transparent';


  return (
    <header className="relative">
      {/* Banner */}
      <div className="relative w-full">
        <div className="w-full relative">
          <picture>
            <source media="(max-width: 640px)" srcSet="/banner-4-1.jpg" />
            <source media="(max-width: 900px)" srcSet="/banner-6-1.jpg" />
            <source media="(max-width: 1280px)" srcSet="/banner-8-1.jpg" />
            <source media="(max-width: 1600px)" srcSet="/banner-10-1.jpg" />
            <Image
              src="/banner-12-1.jpg"
              alt="Banner"
              priority
              width={3840}
              height={320}
              className="banner-image"
            />
          </picture>
        </div>

        {/* Language selector */}
        <div ref={localeMenuRef} className="absolute top-2 right-2 z-50">
          <button
            type="button"
            onClick={() => setLocaleMenuOpen((prev) => !prev)}
            className="rounded-full p-1 hover:bg-white/30 transition"
            aria-label="Select language"
            aria-expanded={localeMenuOpen}
          >
            <Image
              src="/globe.svg"
              alt="Language selector"
              width={36}
              height={36}
              className="object-contain transition-transform duration-200 ease-out hover:scale-110 active:scale-95"
            />
          </button>

          {localeMenuOpen && (
            <div className="absolute right-0 mt-2 bg-white/85 backdrop-blur-sm p-2 rounded shadow-md text-sm min-w-[120px]">
              <ul className="space-y-1">
                {SUPPORTED_LOCALES.map((locale) => (
                  <li key={locale}>
                    <button
                      type="button"
                      onClick={() => {
                        setLocaleMenuOpen(false);
                        router.push(switchLocale(pathname, locale));
                      }}
                      className={`block w-full text-left px-2 py-1 rounded text-[#3a5c03] hover:bg-white/70 ${
                        currentLocale === locale ? 'font-bold' : ''
                      }`}
                    >
                      {locale === 'en'
                        ? headerMessages.localeEn
                        : locale === 'de'
                          ? headerMessages.localeDe
                          : headerMessages.localeEs}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <nav className="bg-gray-200 relative">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between desktop:justify-center gap-4 h-auto relative">
          {/* Auth menu */}
          <div className="relative">
            <button
              onClick={() => setAuthMenuOpen((prev) => !prev)}
              className="px-3 py-2 rounded hover:bg-gray-300 font-medium text-gray-800 whitespace-nowrap flex items-center gap-2"
            >
              <span aria-hidden="true">
                {user ? "👤" : "🔐"}
              </span>

              <span>
                {user
                  ? headerMessages.menuAuthSession.replace("{username}", user.username)
                  : headerMessages.menuAuthNoSession}
              </span>
            </button>

            {authMenuOpen && (
              <div className="absolute left-0 top-full mt-2 min-w-[160px] w-max bg-white border rounded shadow-md z-50">
                <ul className="flex flex-col">
                  {!user && (
                    <>
                      <li>
                        <button
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                          onClick={openLogin}
                        >
                          {headerMessages.menuLogin}
                        </button>
                      </li>
                      <li>
                        <button
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                          onClick={openSignup}
                        >
                          {headerMessages.menuSignup}
                        </button>
                      </li>
                      <li>
                        <button
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                          onClick={openResetPassword}
                        >
                          {headerMessages.menuResetPassword}
                        </button>
                      </li>
                    </>
                  )}

                  {user && (
                    <>
                      <li>
                        <button
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                          onClick={openLogout}
                        >
                          {headerMessages.menuLogout}
                        </button>
                      </li>
                      <li>
                        <button
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                          onClick={openChangePassword}
                        >
                          {headerMessages.menuChangePassword}
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Hamburger for mobile */}
          <button
            type="button"
            className="desktop:hidden absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="relative block w-6 h-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-6 bg-black transition-all duration-200 ease-out ${
                  menuOpen ? "top-2 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-2 h-0.5 w-6 bg-black transition-all duration-200 ease-out ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-4 h-0.5 w-6 bg-black transition-all duration-200 ease-out ${
                  menuOpen ? "top-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          {/* Desktop/laptop navbar */}
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="px-4 w-full flex justify-center"> 
              <ul className="hidden desktop:flex space-x-2">
                {menuItems.map((item, index) => (
                  <li key={item.href}>
                    <HeaderLink
                      href={item.href}
                      isActive={isItemActive(item.href)}
                      style={{ backgroundColor: tabColors[index % tabColors.length] }}
                      className="px-4 py-1 rounded-t-lg relative z-10 whitespace-nowrap"
                    >
                      {item.label}
                    </HeaderLink>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="hidden desktop:block w-full h-1"
              style={{ backgroundColor: activeColor }}
            />
          </div>
          
          {/* Auth modals */}
          <SetPasswordEntry locale={currentLocale} messages={authMessages} />
          {showLoginModal && (
            <AuthModal onClose={closeLogin}>
              <LoginForm
                locale={currentLocale}
                messages={authMessages}
                onForgotPassword={switchToResetPassword}
                onSuccess={() => {
                  fetch(`${API_BASE}/auth/status/`, {
                    credentials: "include",
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.is_authenticated) {
                        setUser({
                          username: data.username,
                          isSuperuser: data.is_superuser,
                        });
                      } else {
                        setUser(null);
                      }
                      closeLogin();
                    })
                    .catch((err) => console.error(err));
                }}
              />
            </AuthModal>
          )}

          {showSignupModal && (
            <AuthModal onClose={closeSignup}>
              <SignupForm
                locale={currentLocale}
                messages={authMessages} 
                onSuccess={() => {
                  alert(headerMessages.alertSignupSuccess);
                  closeSignup();
                }}
              />
            </AuthModal>
          )}

          {showChangePasswordModal && (
            <AuthModal onClose={closeChangePassword}>
              <ChangePasswordForm
                locale={currentLocale}
                messages={authMessages}
                onForgotPassword={switchToResetPassword}
                onSuccess={() => {
                  alert(authMessages.changePassword.messageSuccess);
                  closeChangePassword();
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
                onCancel={closeLogout}
              />
            </AuthModal>
          )}

          <ResetPasswordEntry locale={currentLocale} messages={authMessages} />
          {showResetPasswordModal && (
            <AuthModal onClose={closeResetPassword}>
              <ResetPasswordForm
                locale={currentLocale}
                messages={authMessages}
                onClose={closeResetPassword}
              />
            </AuthModal>
          )}
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />

            <div className="desktop:hidden absolute right-4 top-full mt-2 w-56 bg-white border shadow-lg rounded-lg p-2 flex flex-col gap-1 text-sm z-50">
              {menuItems.map((item, index) => (
                <HeaderLink
                  key={item.href}
                  href={item.href}
                  isActive={isItemActive(item.href)}
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