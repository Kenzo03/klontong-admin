import { defineStore } from 'pinia'

type Notice = { text: string; color?: 'error' | 'warning' }

/** App-wide UI state: the one snackbar (pages call notify(), app.vue shows it) and the "Pengguna" badge. */
export const useUiStore = defineStore('ui', () => {
  const notice = ref<Notice | null>(null)
  const pendingUsers = ref(0) // PENDING registrations, shown as a badge on "Pengguna"

  function notify(text: string, color?: Notice['color']) {
    notice.value = { text, color }
  }

  return { notice, pendingUsers, notify }
})