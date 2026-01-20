import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function ProductionLayout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
