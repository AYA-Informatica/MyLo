import { useState, useEffect, useRef } from 'react';
import {
  useSendMessageMutation,
  useGetConversationQuery,
  useCreateConversationMutation,
  type AIMessage,
} from '../app/api/ai';
import AIChatMessage from './AIChatMessage';
import InPuts from './InPuts';
import Button from './Button';
import { FiArrowRight, FiLoader } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { ChatStorageUtils } from '../utils/chatStorage';

interface AIChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated: (conversationId: string) => void;
}

export default function AIChatInterface({
  conversationId,
  onConversationCreated,
}: AIChatInterfaceProps) {
  const [query, setQuery] = useState('');
  const [localMessages, setLocalMessages] = useState<AIMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationData, isLoading: isLoadingConversation } = useGetConversationQuery(
    conversationId!,
    { skip: !conversationId },
  );

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [createConversation] = useCreateConversationMutation();

  // Load conversation from localStorage or API
  useEffect(() => {
    if (conversationId) {
      // First try to load from localStorage
      const localConversation = ChatStorageUtils.getConversation(conversationId);
      if (localConversation) {
        setLocalMessages(localConversation.messages);
      } else if (conversationData?.data?.messages) {
        // Fallback to API data
        setLocalMessages(conversationData.data.messages);
        // Save to localStorage for future use
        ChatStorageUtils.saveConversation(conversationData.data);
      }
    } else {
      // Check if there's a selected conversation from history page
      const selectedConversationId = localStorage.getItem('selectedConversationId');
      if (selectedConversationId) {
        const localConversation = ChatStorageUtils.getConversation(selectedConversationId);
        if (localConversation) {
          setLocalMessages(localConversation.messages);
          onConversationCreated(selectedConversationId);
        }
        // Clear the selected conversation ID
        localStorage.removeItem('selectedConversationId');
      } else {
        setLocalMessages([]);
      }
    }
  }, [conversationData, conversationId, onConversationCreated]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (conversationId && localMessages.length > 0) {
      ChatStorageUtils.updateConversationMessages(conversationId, localMessages);
    }
  }, [conversationId, localMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || isSending) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content: query.trim(),
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setLocalMessages((prev) => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');

    try {
      let targetConversationId = conversationId;

      // If no conversation exists, create one
      if (!conversationId) {
        const newConversation = await createConversation({
          title: currentQuery.slice(0, 50) + (currentQuery.length > 50 ? '...' : ''),
          question: currentQuery,
        }).unwrap();

        // Handle the actual API response structure
        if (newConversation.data?.id) {
          targetConversationId = newConversation.data.id;
          onConversationCreated(targetConversationId);

          if (newConversation.data.messages) {
            setLocalMessages(newConversation.data.messages);
            // Save to localStorage
            ChatStorageUtils.saveConversation(newConversation.data);
          }
        } else {
          // If no conversation ID, create AI response from the answer
          const aiMessage: AIMessage = {
            id: (Date.now() + 1).toString(),
            content:
              newConversation.answer || "I received your message but couldn't process it properly.",
            role: 'assistant',
            timestamp: new Date().toISOString(),
          };

          const newMessages = [userMessage, aiMessage];
          setLocalMessages(newMessages);

          // Create a local conversation
          const localConversationId = Date.now().toString();
          ChatStorageUtils.saveConversation({
            id: localConversationId,
            title: currentQuery.slice(0, 50) + (currentQuery.length > 50 ? '...' : ''),
            messages: newMessages,
          });

          onConversationCreated(localConversationId);
        }
      } else {
        // Send message to existing conversation
        const response = await sendMessage({
          question: currentQuery,
          conversationId: targetConversationId ?? undefined,
        }).unwrap();

        // Handle the actual API response structure
        let aiMessage: AIMessage;

        if (response.message) {
          aiMessage = response.message;
        } else if (response.answer) {
          aiMessage = {
            id: (Date.now() + 1).toString(),
            content: response.answer,
            role: 'assistant',
            timestamp: new Date().toISOString(),
          };
        } else {
          throw new Error('Invalid response format');
        }

        setLocalMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error?.data?.message || 'Failed to send message');

      // Remove the user message on error
      setLocalMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
      setQuery(currentQuery); // Restore the query
    }
  };

  const isNewChat = !conversationId && localMessages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto w-full mt-14">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        {isLoadingConversation ? (
          <div className="flex justify-center items-center h-32">
            <FiLoader className="w-6 h-6 animate-spin text-primary-800" />
          </div>
        ) : isNewChat ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-primary-800 mb-4">Legal AI Assistant</h1>
              <p className="text-gray-600 text-lg max-w-2xl">
                Your AI legal assistant is here to help. Ask me anything about laws, legal
                procedures, or get legal advice.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {localMessages.map((message) => (
              <AIChatMessage key={message.id} message={message} />
            ))}

            {isSending && (
              <div className="flex gap-3 mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-800 rounded-full flex items-center justify-center">
                  <FiLoader className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-white border border-gray-200 text-gray-800 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Centered */}
      <div className="px-4 py-6">
        <div className="w-full max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative w-full">
              <InPuts
                textarea={true}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about laws, legal procedures, or get legal advice..."
                className="rounded-xl border border-primary-800/20 px-4 pr-14 py-4 bg-white shadow-sm focus:ring-2 focus:ring-primary-800/20 focus:border-primary-800 text-base w-full resize-none"
                rows={1}
              />
              <Button
                type="submit"
                disabled={!query.trim() || isSending}
                variant="primary"
                size="sm"
                className="absolute top-1/2 right-3 -translate-y-1/2 px-4 py-2 bg-primary-800 text-white rounded-xl min-w-0 h-10 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? <FiLoader className="animate-spin" /> : <FiArrowRight />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
