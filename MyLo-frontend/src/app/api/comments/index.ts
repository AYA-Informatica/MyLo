import { apiSlice } from '../apiEntry';



export const commentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query({
      query: (postId: string) => `/posts/${postId}/comments`,
      providesTags: (result, error, postId) => [
        { type: 'Comments', id: postId },
        ...(result
          ? result.map(({ id }: { id: string }) => ({
              type: 'Comments' as const,
              id,
            }))
          : []),
        ...(error ? [{ type: 'Comments' as const, id: 'LIST' }] : []),
      ],
    }),
    addComment: builder.mutation({
      query: ({ postId, content }: { postId: string; content: string }) => ({
        url: `/posts/${postId}/comments`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: 'Comments', id: postId },
        ...(result ? [{ type: 'Comments' as const, id: result.id }] : []),
        ...(error ? [{ type: 'Comments' as const, id: 'LIST' }] : []),
      ],
    }),
    deleteComment: builder.mutation({
      // Accept an object with postId and id
      query: ({ postId, id }: { postId: string; id: string }) => ({
        url: `/posts/${postId}/comments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { postId, id }) => [
        { type: 'Comments', id: postId },
        ...(result ? [{ type: 'Comments' as const, id }] : []),
        ...(error ? [{ type: 'Comments' as const, id: 'LIST' }] : []),
      ],
    }),

    updateComment: builder.mutation({
      query: ({ postId, id, content }: { postId: string; id: string; content: string }) => ({
        url: `/posts/${postId}/comments/${id}`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: 'Comments', id: postId },
        ...(result ? [{ type: 'Comments' as const, id: result.id }] : []),
        ...(error ? [{ type: 'Comments' as const, id: 'LIST' }] : []),
      ],
    }),
  }),
});
export const { useGetCommentsQuery, useAddCommentMutation, useDeleteCommentMutation, useUpdateCommentMutation } = commentsApi;