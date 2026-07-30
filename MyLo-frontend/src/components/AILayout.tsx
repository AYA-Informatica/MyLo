import AISideBar from './AISideBar';
import GeneralNav from './GeneralNav';

interface AILayoutProps {
  children: React.ReactNode;
  currentConversationId?: string;
  onSelectConversation?: (conversationId: string | null) => void;
  onNewConversation?: () => void;
}

export default function AILayout({
  children,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: AILayoutProps) {
  return (
    <div className="flex min-h-screen bg-[color:var(--color-style-500)] font-sans">
      {/* Sidebar */}
      <AISideBar
        currentConversationId={currentConversationId}
        onSelectConversation={onSelectConversation || (() => {})}
        onNewConversation={onNewConversation || (() => {})}
      />
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <GeneralNav />
        {/* Page Content */}
        <main className="flex-1 p-6 bg-[color:var(--color-style-500)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
