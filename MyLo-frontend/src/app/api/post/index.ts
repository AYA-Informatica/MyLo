import { apiSlice } from '../apiEntry';

export const postApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPosts: builder.query<any, void>({
      query: () => ({
        url: '/posts',
        method: 'GET',
      }),
      providesTags: ['Posts'],
    }),
    getPost: builder.query<any, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => {
        void result;
        void error;
        return [{ type: 'Posts', id }];
      },
    }),
    createPost: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: '/posts',
        method: 'POST',
        body: formData,
        // Remove Content-Type header to let browser set it for FormData
      }),
      invalidatesTags: ['Posts'],
    }),
    updatePost: builder.mutation<any, { id: string; data: FormData | Partial<any> }>({
      query: ({ id, data }) => ({
        url: `/posts/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => {
        void result;
        void error;
        return ['Posts', { type: 'Posts', id } as const];
      },
    }),
    deletePost: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => {
        void result;
        void error;
        return ['Posts', { type: 'Posts', id } as const];
      },
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = postApi;
