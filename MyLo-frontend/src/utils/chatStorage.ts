import type { AIMessage, AIConversation } from '../app/api/ai';

interface LocalConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
  preview: string;
}

export const ChatStorageUtils = {
  // Save a conversation to localStorage
  saveConversation: (conversation: Partial<AIConversation> & { messages: AIMessage[] }) => {
    try {
      const existingHistory = ChatStorageUtils.getAllConversations();

      const localConversation: LocalConversation = {
        id: conversation.id || Date.now().toString(),
        title: conversation.title || 'Untitled Conversation',
        messages: conversation.messages,
        createdAt: conversation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preview: ChatStorageUtils.generatePreview(conversation.messages),
      };

      // Check if conversation already exists
      const existingIndex = existingHistory.findIndex((conv) => conv.id === localConversation.id);

      if (existingIndex >= 0) {
        // Update existing conversation
        existingHistory[existingIndex] = localConversation;
      } else {
        // Add new conversation
        existingHistory.unshift(localConversation);
      }

      // Keep only the last 100 conversations to prevent localStorage bloat
      const trimmedHistory = existingHistory.slice(0, 100);

      localStorage.setItem('chatHistory', JSON.stringify(trimmedHistory));
      return localConversation;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  },

  // Get all conversations from localStorage
  getAllConversations: (): LocalConversation[] => {
    try {
      const stored = localStorage.getItem('chatHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  },

  // Get a specific conversation by ID
  getConversation: (id: string): LocalConversation | null => {
    const conversations = ChatStorageUtils.getAllConversations();
    return conversations.find((conv) => conv.id === id) || null;
  },

  // Delete a conversation
  deleteConversation: (id: string): boolean => {
    try {
      const conversations = ChatStorageUtils.getAllConversations();
      const filtered = conversations.filter((conv) => conv.id !== id);
      localStorage.setItem('chatHistory', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  },

  // Clear all conversations
  clearAllConversations: (): boolean => {
    try {
      localStorage.removeItem('chatHistory');
      return true;
    } catch (error) {
      console.error('Error clearing conversations:', error);
      return false;
    }
  },

  // Generate preview text from messages
  generatePreview: (messages: AIMessage[]): string => {
    if (messages.length === 0) return 'New conversation';

    // Try to get the first user message
    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.length > 100
        ? firstUserMessage.content.substring(0, 100) + '...'
        : firstUserMessage.content;
    }

    // Fallback to first message
    const firstMessage = messages[0];
    return firstMessage.content.length > 100
      ? firstMessage.content.substring(0, 100) + '...'
      : firstMessage.content;
  },

  // Update messages for an existing conversation
  updateConversationMessages: (id: string, messages: AIMessage[]): boolean => {
    try {
      const conversations = ChatStorageUtils.getAllConversations();
      const conversationIndex = conversations.findIndex((conv) => conv.id === id);

      if (conversationIndex >= 0) {
        conversations[conversationIndex].messages = messages;
        conversations[conversationIndex].updatedAt = new Date().toISOString();
        conversations[conversationIndex].preview = ChatStorageUtils.generatePreview(messages);

        localStorage.setItem('chatHistory', JSON.stringify(conversations));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating conversation messages:', error);
      return false;
    }
  },
};
