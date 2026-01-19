import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function BandsLayout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
