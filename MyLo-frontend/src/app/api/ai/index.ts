import { apiSlice } from '../apiEntry';

export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface AIApiResponse {
  answer: string;
  message?: AIMessage;
  documents: any[];
  source: string;
  conversationId?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIResponse {
  message?: AIMessage;
  answer?: string; // ✅ Add fallback for direct answer
  conversationId?: string;
}

export const aiApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendMessage: builder.mutation<AIApiResponse, { question: string; conversationId?: string }>({
      query: ({ question, conversationId }) => ({
        url: '/documents/query',
        method: 'POST',
        body: {
          question,
          conversationId,
        },
      }),
      invalidatesTags: ['AIConversations'],
    }),

    getConversations: builder.query<
      { data: AIConversation[]; success: boolean; message: string },
      void
    >({
      query: () => ({
        url: '/documents/query-history',
        method: 'GET',
      }),
      providesTags: ['AIConversations'],
    }),

    getConversation: builder.query<
      { data: AIConversation; success: boolean; message: string },
      string
    >({
      query: (conversationId) => ({
        url: `/ai/conversations/${conversationId}`,
        method: 'GET',
      }),
      providesTags: (result, error, conversationId) => {
        void result;
        void error;
        return [{ type: 'AIConversations', id: conversationId }];
      },
    }),

    createConversation: builder.mutation<
      AIApiResponse & { data?: AIConversation },
      { title: string; question: string }
    >({
      query: ({ title, question }) => ({
        url: '/documents/query',
        method: 'POST',
        body: { title, question },
      }),
      invalidatesTags: ['AIConversations'],
    }),

    deleteConversation: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AIConversations'],
    }),

    generateLawOfTheDay: builder.mutation<
      { data: { title: string; content: string }; success: boolean; message: string },
      void
    >({
      query: () => ({
        url: '/ai/law-of-the-day',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useSendMessageMutation,
  useGetConversationsQuery,
  useGetConversationQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  useGenerateLawOfTheDayMutation,
} = aiApi;
