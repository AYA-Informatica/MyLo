import { apiSlice } from '../apiEntry';



export const domainApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDomains: builder.query<any, void>({
      query: () => ({
        url: '/domains',
        method: 'GET',
      }),
      providesTags: ['Domains'],
    }),
    getDomain: builder.query<any, string>({
      query: (id) => ({
        url: `/domains/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => {
        void result;
        void error;
        return [{ type: 'Domains', id }];
      },
    }),
    createDomain: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: '/domains',
        method: 'POST',
        body: formData,
        // Remove Content-Type header to let browser set it for FormData
      }),
      invalidatesTags: ['Domains'],
    }),
    updateDomain: builder.mutation<any, { id: string; data: FormData | Partial<any> }>({
      query: ({ id, data }) => ({
        url: `/domains/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => {
        void result;
        void error;
        return ['Domains', { type: 'Domains', id } as const];
      },
    }),
    deleteDomain: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/domains/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => {
        void result;
        void error;
        return ['Domains', { type: 'Domains', id } as const];
      },
    }),
  }),
});

export const {
  useGetDomainsQuery,
  useGetDomainQuery,
  useCreateDomainMutation,
  useUpdateDomainMutation,
  useDeleteDomainMutation,
} = domainApi;
