/**
 * Shared shapes for talking to the MyLo API.
 *
 * Every endpoint answers with the same envelope, and RTK Query surfaces a failed
 * request as an object carrying that envelope under `data`. Modelling both here
 * keeps call sites from reaching into `any` to read an error message.
 */

/** The envelope every MyLo endpoint responds with. */
export interface ApiEnvelope<T> {
  data: T;
  message?: string;
  success: boolean;
}

/** A failed request as RTK Query hands it back. */
export interface ApiError {
  status?: number | string;
  data?: {
    message?: string;
    [key: string]: unknown;
  };
  message?: string;
}

/** Narrows an unknown thrown value to something with a readable message. */
export const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' && error !== null && ('data' in error || 'message' in error);

/**
 * Pulls a human-readable message out of a failed request.
 *
 * Prefers the server's own message, falls back to a thrown Error's message, and
 * finally to the caller's default — so a toast always says something useful.
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isApiError(error)) {
    if (typeof error.data?.message === 'string' && error.data.message) {
      return error.data.message;
    }
    if (typeof error.message === 'string' && error.message) {
      return error.message;
    }
  }
  return fallback;
};

/**
 * Claims carried by a MyLo access token.
 *
 * Mirrors what the API signs at login: identity, the role that drives routing and
 * permissions, and which auth provider issued it.
 */
export interface MyLoJwtPayload {
  id: string;
  email: string;
  role: string;
  provider?: 'local' | 'google';
  /** Token id, used to revoke a single session. */
  jti?: string;
  iat?: number;
  exp?: number;
  /** Present on profiles that have completed onboarding. */
  name?: string;
  username?: string;
  avatarUrl?: string;
}
