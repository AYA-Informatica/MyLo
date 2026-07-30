import { apiSlice } from '../apiEntry';

export const upvoteApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    upvotePost: builder.mutation<{ success: boolean }, { postID: string; userId: string }>({
      query: ({ postID, userId }) => {
        try {
          return {
            url: `/posts/${postID}/upvotes`,
            method: 'POST',
            body: { userId },
          };
        } catch (error) {
          console.error('Error in upvotePost query:', error);
          throw error;
        }
      },
      invalidatesTags: (_, __, { postID }) => {
        try {
          return [{ type: 'Posts', id: postID }];
        } catch (err) {
          console.error('Error in upvotePost invalidatesTags:', err);
          return [];
        }
      },
      transformErrorResponse: (response) => {
        try {
          console.error('Upvote post error:', response);
          return response.data || response;
        } catch (error) {
          console.error('Error transforming upvote response:', error);
          return { error: 'Failed to upvote post' };
        }
      },
    }),

    getPostUpvotes: builder.query<{ upvotes: number }, { postID: string }>({
      query: ({ postID }) => {
        try {
          return {
            url: `/posts/${postID}/upvotes`,
            method: 'GET',
          };
        } catch (error) {
          console.error('Error in getPostUpvotes query:', error);
          throw error;
        }
      },
      providesTags: (_, __, { postID }) => {
        try {
          return [{ type: 'Posts', id: postID }];
        } catch (err) {
          console.error('Error in getPostUpvotes providesTags:', err);
          return [];
        }
      },
      transformErrorResponse: (response) => {
        try {
          console.error('Get post upvotes error:', response);
          return response.data || response;
        } catch (error) {
          console.error('Error transforming get upvotes response:', error);
          return { error: 'Failed to get post upvotes' };
        }
      },
    }),

    removeUpvote: builder.mutation<{ success: boolean }, { postID: string; userId: string }>({
      query: ({ postID, userId }) => {
        try {
          return {
            url: `/posts/${postID}/upvote`,
            method: 'DELETE',
            body: { userId },
          };
        } catch (error) {
          console.error('Error in removeUpvote query:', error);
          throw error;
        }
      },
      invalidatesTags: (_, __, { postID }) => {
        try {
          return [{ type: 'Posts', id: postID }];
        } catch (err) {
          console.error('Error in removeUpvote invalidatesTags:', err);
          return [];
        }
      },
      transformErrorResponse: (response) => {
        try {
          console.error('Remove upvote error:', response);
          return response.data || response;
        } catch (error) {
          console.error('Error transforming remove upvote response:', error);
          return { error: 'Failed to remove upvote' };
        }
      },
    }),
  }),
});

export const { useUpvotePostMutation, useRemoveUpvoteMutation, useGetPostUpvotesQuery } = upvoteApi;
