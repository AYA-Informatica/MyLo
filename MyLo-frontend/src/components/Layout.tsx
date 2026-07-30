import type { ReactNode } from 'react';
import GeneralFoot from './GeneralFoot';
import GeneralNav from './GeneralNav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div>
      <GeneralNav />
      <main>{children}</main>
      <GeneralFoot />
    </div>
  );
}
