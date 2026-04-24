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
        ${
          isActive
            ? "scale-[1.04] translate-y-[2px]" 
            : "hover:scale-[1.03] active:scale-[1.04]"
        }
        ${className}
      `}
    >
      <span
        className={`
          inline-block
          transition-all duration-200 ease-out
          ${
            isActive
              ? "font-bold scale-[1.03]"
              : "font-medium group-hover:font-semibold group-hover:scale-[1.02] group-active:scale-[1.03]"
          }
        `}
      >
        {children}
      </span>
    </Link>
  );
}