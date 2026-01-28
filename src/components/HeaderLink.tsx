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
  isActive,
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
      className={`
        px-4 py-2 rounded-t-lg font-semibold
        transform hover:brightness-110
        ${isActive ? "ring-2 ring-offset-2" : ""}
        ${className}
      `}
      style={style}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
