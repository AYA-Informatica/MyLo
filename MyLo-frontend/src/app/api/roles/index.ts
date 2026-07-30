import { apiSlice } from '../apiEntry';
import type { ApiEnvelope } from '../../../types/api';
import type { ApiRole } from '../../../types/entities';

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<ApiEnvelope<{ roles: ApiRole[] }>, void>({
      query: () => ({
        url: '/roles',
        method: 'GET',
      }),
      providesTags: ['Roles'],
    }),
  }),
});

export const { useGetRolesQuery } = rolesApi;
