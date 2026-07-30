import { useEffect, useState } from 'react';
import { FaRegEdit } from 'react-icons/fa';
import { MdOutlineLibraryBooks } from 'react-icons/md';
import { BsClockHistory } from 'react-icons/bs';
import { FiMenu, FiTrash2 } from 'react-icons/fi';
import { useGetConversationsQuery, useDeleteConversationMutation } from '../app/api/ai';
import { toast } from 'react-toastify';
import { ChatStorageUtils } from '../utils/chatStorage';
import { useNavigate } from 'react-router-dom';


interface AISideBarProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string | null) => void;
  onNewConversation: () => void;
}

interface LocalConversation {
  id: string;
  title: string;
  messages: any[]; // or more specific message type
  createdAt: string;
  updatedAt: string;
}

export default function AISideBar({
  currentConversationId,
  onSelectConversation,
}: AISideBarProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate(); 
  const { data: conversationsData, isLoading } = useGetConversationsQuery();
  const [deleteConversation] = useDeleteConversationMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, setLocalConversations] = useState<LocalConversation[]>([]);

 const conversations = conversationsData?.data || [];

 useEffect(() => {
   const loadLocalConversations = () => {
     const localChats = ChatStorageUtils.getAllConversations();
     setLocalConversations(localChats);
   };

   loadLocalConversations();

   // Listen for localStorage changes
   window.addEventListener('storage', loadLocalConversations);
   return () => window.removeEventListener('storage', loadLocalConversations);
 }, []);

  //  const allConversations = [...conversations, ...localConversations];

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deletingId) return;

    setDeletingId(conversationId);

    try {
      await deleteConversation(conversationId).unwrap();
      toast.success('Conversation deleted');

      // If we're deleting the current conversation, go to new chat
      if (currentConversationId === conversationId) {
        onSelectConversation(null);
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast.error(error?.data?.message || 'Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Hamburger menu for mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow mt-16"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <FiMenu size={24} className="text-[color:var(--color-primary-800)]" />
      </button>

      {/* Sidebar for desktop and mobile drawer */}
      <aside
        className={`
          bg-white flex flex-col items-center py-6 z-40
          md:static md:w-56 md:min-h-screen md:translate-x-0
          fixed top-0 left-0 h-full w-4/5 max-w-xs transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Close button for mobile */}
        <div className="w-full flex md:hidden justify-end pr-4">
          <button
            className="text-2xl text-gray-500 mt-2"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-6 w-full px-8 pt-16">
          <button
            onClick={() => navigate('/ai')}
            className="flex items-center gap-3 text-base md:text-lg font-regular text-gray-600 hover:text-primary-800 transition hover:translate-x-1"
          >
            <FaRegEdit className="text-[color:var(--color-primary-800)] text-xl" />
            New chat
          </button>

          <button className="flex items-center gap-3 text-base md:text-lg font-regular text-gray-600 hover:text-primary-800 transition hover:translate-x-1">
            <MdOutlineLibraryBooks className="text-[color:var(--color-primary-800)] text-xl" />
            Library
          </button>

          <button
            onClick={() => navigate('/chat-history')}
            className="flex items-center gap-3 text-base md:text-lg font-regular text-gray-600 hover:text-primary-800 transition hover:translate-x-1"
          >
            <BsClockHistory className="text-[color:var(--color-primary-800)] text-xl" />
            Chat History
          </button>
        </nav>

        {/* Conversations List */}
        <div className="flex-1 w-full px-4 mt-6 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    setOpen(false);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                    currentConversationId === conversation.id
                      ? 'bg-primary-100 border border-primary-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    disabled={deletingId === conversation.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all"
                  >
                    {deletingId === conversation.id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiTrash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {open && (
        <div
          className="fixed inset-0 bg-primary-800 bg-opacity-30 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
