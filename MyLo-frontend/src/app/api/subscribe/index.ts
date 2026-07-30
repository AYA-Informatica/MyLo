import { apiSlice } from '../apiEntry';


export const subscribeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    subscribe: builder.mutation<any, { email: string }>({
      query: (data) => ({
        url: '/subscribers',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
    useSubscribeMutation,
} = subscribeApi;