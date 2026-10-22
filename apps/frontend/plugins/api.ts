import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'

/** The app's one HTTP client. Same-origin /api, so the httpOnly cookie travels automatically. */
export default defineNuxtPlugin((nuxtApp) => {
  const api = $fetch.create({
    baseURL: '/api',
    async onResponseError({ request, response }) {
      // The login page and the route guard handle their own 401s (wrong password, not logged in yet).
      if (response.status !== 401 || /\/auth\/(login|me)$/.test(String(request))) return
      await nuxtApp.runWithContext(async () => {
        const auth = useAuthStore()
        // Someone was logged in and the API now says no: the session ended (expired or deactivated).
        if (auth.user) useUiStore().notify('Sesi berakhir, silakan masuk lagi.', 'warning')
        auth.user = null
        await navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
      })
    },
  })
  return { provide: { api } }
})