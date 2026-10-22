import type { Item, Page, Role, User, UserStatus } from '~/types/api'

export type UserUpdate = { role?: Role; status?: 'ACTIVE' | 'INACTIVE' | 'REJECTED' }
type UserPage = Page<User> & { meta: { counts: Partial<Record<UserStatus, number>> } }

/** ADMIN-only user management (PRD 5.4). */
export function useUsersService() {
  const { $api } = useNuxtApp()
  return {
    list: (query: { status?: UserStatus; page?: number; pageSize?: number }) => $api<UserPage>('/users', { query }),
    update: (id: number, body: UserUpdate) => $api<Item<User>>(`/users/${id}`, { method: 'PATCH', body }),
  }
}