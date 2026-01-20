import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function TechnicalLayout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
