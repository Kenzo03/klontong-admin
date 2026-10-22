import { useAuthStore } from '~/stores/auth'

// `.global` = runs before every route change. Pages opt out with definePageMeta({ public: true }).
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.checked) await auth.fetchMe() // once per page load (also after F5)
  const isPublic = to.meta.public === true
  if (!auth.user && !isPublic) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  if (auth.user && isPublic) return navigateTo('/') // logged-in users don't need Masuk or Daftar
})