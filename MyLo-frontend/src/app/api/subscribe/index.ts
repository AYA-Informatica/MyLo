import { apiSlice } from '../apiEntry';
import type { ApiEnvelope } from '../../../types/api';

export const subscribeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    subscribe: builder.mutation<ApiEnvelope<unknown>, { email: string }>({
      query: (data) => ({
        url: '/subscribers',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { useSubscribeMutation } = subscribeApi;
