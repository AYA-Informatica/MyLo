import { apiSlice } from '../apiEntry';

export const rolesApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getRoles: builder.query<any, void>({
            query: () => ({
                url: '/roles',
                method: 'GET',
            }),
            providesTags: ['Roles'],
        }),


    }),
})

export const {
    useGetRolesQuery,
} = rolesApi;