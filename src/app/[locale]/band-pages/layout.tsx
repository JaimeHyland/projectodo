import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function BandPagesLayout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
