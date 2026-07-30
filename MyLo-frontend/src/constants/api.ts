export const API_BASE_URL = 'https://menyalo-backend.onrender.com/api/v1';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  
  // Users
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    LIST: '/users',
    GET_BY_ID: (id: string) => `/users/${id}`,
  },

  // Firms
  FIRMS: {
    LIST: '/firms',
    CREATE: '/firms',
    GET_BY_ID: (id: string) => `/firms/${id}`,
    UPDATE: (id: string) => `/firms/${id}`,
    DELETE: (id: string) => `/firms/${id}`,
  },

  // Posts/Feed
  POSTS: {
    LIST: '/posts',
    CREATE: '/posts',
    GET_BY_ID: (id: string) => `/posts/${id}`,
    UPDATE: (id: string) => `/posts/${id}`,
    DELETE: (id: string) => `/posts/${id}`,
    LIKE: (id: string) => `/posts/${id}/like`,
    COMMENT: (id: string) => `/posts/${id}/comments`,
  },

  // Community
  COMMUNITY: {
    LIST: '/community',
    CREATE: '/community',
    JOIN: (id: string) => `/community/${id}/join`,
    LEAVE: (id: string) => `/community/${id}/leave`,
  },

  // AI
  AI: {
    CHAT: '/ai/chat',
    HISTORY: '/ai/history',
  },

  // Legal
  LEGAL: {
    DOCUMENTS: '/legal/documents',
    SEARCH: '/legal/search',
  }
} as const;
