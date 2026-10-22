import { defineStore } from 'pinia'
import { useAuthService } from '~/services/auth'
import type { Me } from '~/types/api'

export const useAuthStore = defineStore('auth', () => {
  const authService = useAuthService()
  const user = ref<Me | null>(null)
  // Has GET /auth/me run since the page loaded? After that, this store is the source of truth.
  const checked = ref(false)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function fetchMe() {
    try {
      user.value = (await authService.me()).data
    } catch {
      user.value = null // 401 = not logged in; anything else is treated the same
    } finally {
      checked.value = true
    }
  }

  async function login(email: string, password: string) {
    user.value = (await authService.login({ email, password })).data
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      user.value = null
    }
  }

  return { user, checked, isAdmin, fetchMe, login, logout }
})