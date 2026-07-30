import GeneralNav from '../components/GeneralNav';
import DashSideBar from '../components/DashSideBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function DashboardLayout({ children, className = '' }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <GeneralNav />

      <div className="flex relative">
        {/* Let DashSideBar handle its own mobile logic */}
        <DashSideBar />

        {/* Main Content Area */}
        <main className={`flex-1 w-full min-w-0 md:ml-64 ${className}`}>
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
