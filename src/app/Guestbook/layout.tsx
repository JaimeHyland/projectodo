import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function ContactLayout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
