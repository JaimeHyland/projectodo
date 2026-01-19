import Link from "next/link";

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
}: HeaderLinkProps) {
  return (
    <Link
      href={href}
      className={`
        px-4 py-2 rounded-t-lg font-semibold
        transform hover:brightness-110
        ${isActive ? "ring-2 ring-offset-2" : ""}
        ${className}
      `}
      style={style}
    >
      {children}
    </Link>
  );
}
