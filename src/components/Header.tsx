'use client';

import { useState } from 'react';
import Image from 'next/image';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    'Home',
    'Lessons',
    'Bands',
    'Technical',
    'Production',
    'News',
    'Press',
    'Guestbook',
    'Contact',
    'Downloads',
  ];

  const downloadSubmenu = ['Download 1', 'Download 2', 'Download 3'];

  // Example pastel/intense colors
  const tabColors = [
    'bg-pink-300',
    'bg-yellow-300',
    'bg-green-300',
    'bg-blue-300',
    'bg-purple-300',
    'bg-indigo-300',
    'bg-orange-300',
    'bg-teal-300',
    'bg-rose-300',
    'bg-cyan-300',
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
      <nav className="bg-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col desktop:flex-row items-center justify-center h-16">
          {/* Hamburger for mobile */}
          <button
            className="desktop:hidden mb-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          {/* Full navbar */}
          <ul className="hidden desktop:flex space-x-2">
            {menuItems.map((item, index) =>
              item === 'Downloads' ? (
                <li key={item} className="relative group">
                  <span
                    className={`px-4 py-2 rounded-t-lg cursor-pointer ${tabColors[index % tabColors.length]} font-semibold`}
                  >
                    {item}
                  </span>
                  <ul className="absolute left-0 mt-1 bg-white text-black rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {downloadSubmenu.map((sub) => (
                      <li key={sub} className="px-4 py-2 hover:bg-gray-200">
                        <a
                          href={`/downloads/${sub
                            .toLowerCase()
                            .replace(/\s+/g, '')}`}
                        >
                          {sub}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item}>
                  <a
                    href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                    className={`px-4 py-2 rounded-t-lg font-semibold ${tabColors[index % tabColors.length]} hover:brightness-110`}
                  >
                    {item}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <ul className="desktop:hidden bg-gray-700 text-white space-y-2 px-4 py-2">
            {menuItems.map((item, index) =>
              item === 'Downloads' ? (
                <li key={item}>
                  <span className={`font-semibold ${tabColors[index % tabColors.length]}`}>
                    {item}
                  </span>
                  <ul className="ml-4 space-y-1">
                    {downloadSubmenu.map((sub) => (
                      <li key={sub}>
                        <a
                          href={`/downloads/${sub
                            .toLowerCase()
                            .replace(/\s+/g, '')}`}
                          className="hover:underline"
                        >
                          {sub}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item}>
                  <a
                    href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                    className={`px-4 py-2 font-semibold rounded ${tabColors[index % tabColors.length]} hover:brightness-110`}
                  >
                    {item}
                  </a>
                </li>
              )
            )}
          </ul>
        )}
      </nav>
    </header>
  );
}
