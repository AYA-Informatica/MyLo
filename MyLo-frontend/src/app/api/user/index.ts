import type { UserstableType, UsersApiResponse } from '../../../types/userstabletypes';
import { apiSlice } from '../apiEntry';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<UserstableType[], void>({
      query: () => ({
        url: '/users',
        method: 'GET',
      }),
      transformResponse: (response: UsersApiResponse) => response.data,
      providesTags: ['Users'],
    }),
    getUser: builder.query<UserstableType, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => {
        void result;
        void error;
        return [{ type: 'Users', id }];
      },
    }),
    createUser: builder.mutation<UserstableType, Partial<UserstableType>>({
      query: (data) => ({
        url: '/users/add',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation<UserstableType, { id: string; data: Partial<UserstableType> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => {
        void result;
        void error;
        return [{ type: 'Users', id }, 'Users'];
      },
    }),
    deleteUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => {
        void result;
        void error;
        return [{ type: 'Users', id }, 'Users'];
      },
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;
