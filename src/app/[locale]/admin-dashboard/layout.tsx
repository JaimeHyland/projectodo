import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function AdminDashboardLayout({ children }: LayoutProps) {
  return (
    <div>
      {children}
    </div>
  );
}
