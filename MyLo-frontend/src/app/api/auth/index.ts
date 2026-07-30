import { apiSlice } from '../apiEntry';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<{ message: string }, any>({
      query: (data) => ({
        url: '/auth/register/citizen',
        method: 'POST',
        body: data,
      }),
    }),
    registerFirm: builder.mutation<{ message: string }, any>({
      query: (data) => ({
        url: '/auth/register/law-firm',
        method: 'POST',
        body: data,
      }),
    }),
    registerOrganization: builder.mutation<{ message: string }, any>({
      query: (data) => ({
        url: '/auth/register/organization',
        method: 'POST',
        body: data,
      }),
    }),

    login: builder.mutation<
      { data: { token: string; role: string }; message: string; success: boolean },
      { email: string; password: string }
    >({
      query: (data) => ({
        url: '/auth/login',
        method: 'POST',
        body: data,
      }),
    }),

    loginwithgoogle: builder.mutation<{ token: string }, { idToken: string }>({
      query: (data) => ({
        url: '/auth/google',
        method: 'GET',
        params: data,
      }),
    }),
    requestReset: builder.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/auth/request-reset',
        method: 'POST',
        body: data,
      }),
    }),
    verifyCode: builder.mutation<{ message: string }, { code: string }>({
      query: (data) => ({
        url: '/auth/verify-code',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, { password: string }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useRegisterFirmMutation,
  useRegisterOrganizationMutation,
  useLoginMutation,
  useLoginwithgoogleMutation,
  useRequestResetMutation,
  useVerifyCodeMutation,
  useResetPasswordMutation,
  useLogoutMutation,
} = authApi;
