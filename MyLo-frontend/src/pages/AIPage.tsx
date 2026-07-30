import { useState } from 'react';
import AILayout from '../components/AILayout';
import AIChatInterface from '../components/AIChatInterface';

export default function AIPage() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const handleSelectConversation = (conversationId: string | null) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleConversationCreated = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  return (
    <AILayout
      currentConversationId={currentConversationId || undefined}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
    >
      <AIChatInterface
        onConversationCreated={handleConversationCreated}
        conversationId={currentConversationId}
      />
    </AILayout>
  );
}
