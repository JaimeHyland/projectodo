import { ReactNode } from 'react';


interface LayoutProps { children: ReactNode; }

export default function LegalNoticeLayout({ children }: LayoutProps) { 
    return (
    <div>
        {children}
    </div> ); 
}
