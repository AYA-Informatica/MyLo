import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AILayout from '../components/AILayout';
import {
  FiMessageSquare,
  FiTrash2,
  FiSearch,
  FiArrowRight,
  FiPlus,
  FiMessageCircle,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import type { AIMessage } from '../app/api/ai';

interface LocalConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
  preview: string;
}

export default function ChatHistoryPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadConversationsFromStorage();
  }, []);

  const loadConversationsFromStorage = () => {
    try {
      const storedConversations = localStorage.getItem('chatHistory');
      if (storedConversations) {
        const parsed: LocalConversation[] = JSON.parse(storedConversations);
        const sorted = parsed.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setConversations(sorted);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (deletingId) return;
    setDeletingId(conversationId);

    try {
      const updatedConversations = conversations.filter((conv) => conv.id !== conversationId);
      setConversations(updatedConversations);
      localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllHistory = () => {
    if (
      window.confirm(
        'Are you sure you want to delete all chat history? This action cannot be undone.',
      )
    ) {
      localStorage.removeItem('chatHistory');
      setConversations([]);
      toast.success('All chat history cleared');
    }
  };

  const openConversation = (conversationId: string) => {
    localStorage.setItem('selectedConversationId', conversationId);
    navigate('/ai');
  };

  const handleSelectConversation = (conversationId: string | null) => {
    if (conversationId) {
      openConversation(conversationId);
    }
  };

  const handleNewConversation = () => {
    navigate('/ai');
  };

  // Filter conversations based on search and time filter
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.preview.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const now = new Date();
    const convDate = new Date(conv.updatedAt);
    const diffDays = Math.ceil((now.getTime() - convDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (selectedFilter) {
      case 'today':
        return diffDays <= 1;
      case 'week':
        return diffDays <= 7;
      case 'month':
        return diffDays <= 30;
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeIcon = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) return '🕐';
    if (diffHours < 168) return '📅';
    return '📆';
  };

  return (
    <AILayout
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 mt-14">
          {/* Modern Header */}
          <div className="mb-8 sm:mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary-100 rounded-xl">
                    <FiMessageCircle className="w-6 h-6 text-primary-800" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      Chat History
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Manage your AI conversations • {conversations.length} total
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/ai')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary-800 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  <FiPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Chat</span>
                  <span className="sm:hidden">New</span>
                </button>

                {conversations.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium border border-red-200"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Clear All</span>
                    <span className="sm:hidden">Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          {conversations.length > 0 && (
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Enhanced Search Bar */}
                <div className="relative flex-1">
                  <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations, messages..."
                    className="w-full pl-12 pr-4 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm transition-all duration-200 text-base"
                  />
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as any)}
                    className="px-4 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-sm transition-all duration-200 text-base min-w-[120px]"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>

                  {/* View Mode Toggle */}
                  <div className="hidden sm:flex bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        viewMode === 'grid'
                          ? 'bg-white shadow-sm text-primary-800'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                        <div className="bg-current rounded-sm"></div>
                        <div className="bg-current rounded-sm"></div>
                        <div className="bg-current rounded-sm"></div>
                        <div className="bg-current rounded-sm"></div>
                      </div>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        viewMode === 'list'
                          ? 'bg-white shadow-sm text-primary-800'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="w-4 h-4 space-y-1">
                        <div className="bg-current h-0.5 rounded"></div>
                        <div className="bg-current h-0.5 rounded"></div>
                        <div className="bg-current h-0.5 rounded"></div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 font-medium">Quick filters:</span>
                {['all', 'today', 'week', 'month'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter as any)}
                    className={`px-3 py-1.5 rounded-full transition-all duration-200 ${
                      selectedFilter === filter
                        ? 'bg-primary-100 text-primary-800 font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversations Display */}
          {filteredConversations.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiMessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
              </h3>
              <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-md mx-auto">
                {conversations.length === 0
                  ? 'Start your first conversation with our AI legal assistant'
                  : 'Try adjusting your search terms or filters'}
              </p>
              {conversations.length === 0 && (
                <button
                  onClick={() => navigate('/ai')}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-primary-800 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-base sm:text-lg"
                >
                  <FiPlus className="w-5 h-5" />
                  Start Your First Chat
                </button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
                  : 'space-y-4'
              }
            >
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group relative bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${
                    viewMode === 'list' ? 'p-4 sm:p-6' : 'p-4 sm:p-6'
                  }`}
                  onClick={() => openConversation(conversation.id)}
                >
                  {/* Gradient Border Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-primary-500/0 group-hover:from-primary-500/10 group-hover:via-primary-500/5 group-hover:to-primary-500/10 transition-all duration-300 rounded-2xl"></div>

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getTimeIcon(conversation.updatedAt)}</span>
                          <span className="text-xs sm:text-sm text-gray-500 font-medium">
                            {formatDate(conversation.updatedAt)}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate group-hover:text-primary-800 transition-colors leading-tight">
                          {conversation.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          disabled={deletingId === conversation.id}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-red-50 text-red-500 transition-all duration-200"
                          title="Delete conversation"
                        >
                          {deletingId === conversation.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <FiTrash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="mb-4">
                      <p className="text-gray-600 text-sm sm:text-base line-clamp-3 leading-relaxed">
                        {conversation.preview}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                        <FiMessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="font-medium">{conversation.messages.length}</span>
                        <span className="hidden sm:inline">messages</span>
                      </div>

                      <div className="flex items-center gap-2 text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <span className="hidden sm:inline">Open</span>
                        <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AILayout>
  );
}
