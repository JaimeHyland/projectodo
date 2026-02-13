import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/config";

function getPreferredLocale(request: NextRequest): string {
  // 1️⃣ Check cookie (repeat visitors)
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as any)) {
    return cookieLocale;
  }

  // 2️⃣ Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().slice(0, 2))
      .find((lang) => SUPPORTED_LOCALES.includes(lang as any));

    if (preferred) return preferred;
  }

  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale redirects for API, Next.js internals
  if (pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/.well-known") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Already localized?
  const hasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  // Apply locale redirect
  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set("NEXT_LOCALE", locale, { maxAge: 60 * 60 * 24 * 365 });

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"], // this matcher remains safe
};
