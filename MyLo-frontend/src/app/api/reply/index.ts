import { apiSlice } from '../apiEntry';

export const replycommentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    addReply: builder.mutation({
      query: ({
        postId,
        commentId,
        content,
      }: {
        postId: string;
        commentId: string;
        content: string;
      }) => {
        console.log('Add reply API call:', { postId, commentId, content });

        return {
          url: `/posts/${postId}/comments/${commentId}/replies`,
          method: 'POST',
          body: {
            content, // Only send content - backend gets author from auth token
          },
        };
      },
      invalidatesTags: (result, error, { postId, commentId }) => {
        void result;
        void error;
        return [
          { type: 'Comments', id: postId },
          { type: 'Comments', id: commentId },
          { type: 'Comments', id: 'LIST' },
        ];
      },
    }),

    getreply: builder.query({
      query: ({ postId, commentId }: { postId: string; commentId: string }) => {
        console.log('Getting replies for:', { postId, commentId });
        return {
          url: `/posts/${postId}/comments/${commentId}/replies`,
          method: 'GET',
        };
      },
      transformResponse: (response: { data: any[]; message: string; success: boolean }) => {
        console.log('Get replies response:', response);
        return response?.data || [];
      },
      providesTags: (result, error, { postId, commentId }) => {
        void error;
        const replies = (result as any[]) || [];
        return [
          { type: 'Comments', id: postId },
          { type: 'Comments', id: commentId },
          ...replies.map(({ id }: { id: string }) => ({
            type: 'Comments' as const,
            id,
          })),
        ];
      },
    }),

    deleteReply: builder.mutation({
      query: ({ postId, commentId, id }: { postId: string; commentId: string; id: string }) => {
        console.log('Delete reply API call:', { postId, commentId, id });

        return {
          url: `/posts/${postId}/comments/${commentId}/replies/${id}`,
          method: 'DELETE',
          // Don't send any body - backend determines authorization from auth token
        };
      },
      invalidatesTags: (result, error, { postId, commentId, id }) => {
        void result;
        void error;
        return [
          { type: 'Comments', id: postId },
          { type: 'Comments', id: commentId },
          { type: 'Comments', id },
          { type: 'Comments', id: 'LIST' },
        ];
      },
    }),

    updateReply: builder.mutation({
      query: ({
        postId,
        commentId,
        id,
        content,
      }: {
        postId: string;
        commentId: string;
        id: string;
        content: string;
      }) => {
        return {
          url: `/posts/${postId}/comments/${commentId}/replies/${id}`,
          method: 'PUT',
          body: {
            content, // Only send content - backend gets author from auth token
          },
        };
      },
      invalidatesTags: (result, error, { postId, commentId, id }) => {
        void result;
        void error;
        return [
          { type: 'Comments', id: postId },
          { type: 'Comments', id: commentId },
          { type: 'Comments', id },
          { type: 'Comments', id: 'LIST' },
        ];
      },
    }),
  }),
});

export const {
  useAddReplyMutation,
  useDeleteReplyMutation,
  useUpdateReplyMutation,
  useGetreplyQuery,
} = replycommentApi;
