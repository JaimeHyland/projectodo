import Link from "next/link";
import { useParams } from "next/navigation";

interface HeaderLinkProps {
  href: string;
  isActive: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: () => void;
}

export function HeaderLink({
  href,
  isActive = false,
  className = "",
  style,
  children,
  onClick,
}: HeaderLinkProps) {
  const params = useParams() ?? {};
  const locale = params.locale || "en";

  const localizedHref = `/${locale}${href}`;

  return (
    <Link
      href={localizedHref}
      onClick={onClick}
      style={style}
      className={`
        group inline-flex items-center justify-center
        px-4 py-2 rounded-t-lg
        origin-bottom
        transition-transform duration-200 ease-out
        ${isActive ? "scale-[1.025]" : "hover:scale-[1.02] active:scale-[1.03]"}
        ${className}
      `}
    >
      <span
        className={`
          inline-block
          transition-all duration-200 ease-out
          ${
            isActive
              ? "font-semibold scale-[1.02]"
              : "font-medium group-hover:font-semibold group-hover:scale-[1.015] group-active:scale-[1.02]"
          }
        `}
      >
        {children}
      </span>
    </Link>
  );
}