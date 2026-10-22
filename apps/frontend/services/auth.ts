import type { Item, Me, User } from '~/types/api'

/** Auth endpoints. Pages and stores call these; they never build URLs themselves. */
export function useAuthService() {
  const { $api } = useNuxtApp()
  return {
    me: () => $api<Item<Me>>('/auth/me'),
    login: (body: { email: string; password: string }) => $api<Item<User>>('/auth/login', { method: 'POST', body }),
    register: (body: { name: string; email: string; password: string }) =>
      $api<Item<User>>('/auth/register', { method: 'POST', body }),
    logout: () => $api('/auth/logout', { method: 'POST' }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      $api('/auth/password', { method: 'PATCH', body }),
  }
}