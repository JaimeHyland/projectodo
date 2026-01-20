'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HeaderLink } from './HeaderLink';
import { usePathname } from "next/navigation";


export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuItems = [
    { label: "Home", href: "/" },
    { label: "Lessons", href: "/lessons" },
    { label: "Bands", href: "/bands" },
    { label: "Technical", href: "/technical" },
    { label: "Production", href: "/production" },
    { label: "News", href: "/news" },
    { label: "Press", href: "/press" },
    { label: "Guestbook", href: "/guestbook" },
    { label: "Contact", href: "/contact" },
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
          <li>German</li>
          <li>English</li>
          <li>Spanish</li>
        </ul>
      </div>

      {/* Navbar */}
      <nav className="bg-gray-200 relative">
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
