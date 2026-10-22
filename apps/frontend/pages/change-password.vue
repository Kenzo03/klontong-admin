<script setup lang="ts">
import type { SubmitEventPromise } from 'vuetify'
import { useAuthService } from '~/services/auth'
import { useUiStore } from '~/stores/ui'

const authService = useAuthService()
const ui = useUiStore()
const form = reactive({ currentPassword: '', newPassword: '', repeat: '' })
const loading = ref(false)
const error = ref('')
const sameAsNew = (v: string) => v === form.newPassword || 'Password tidak sama'

async function submit(event: SubmitEventPromise) {
  if (!(await event).valid) return
  loading.value = true
  error.value = ''
  try {
    await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    ui.notify('Password berhasil diganti.')
    await navigateTo('/')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card max-width="560" class="mx-auto pa-6">
    <h1 class="text-h5 mb-1">Ganti password</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Perangkat lain yang masih masuk dengan akun ini tetap masuk sampai sesinya berakhir (paling lama 8 jam).
    </p>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />
    <v-form @submit.prevent="submit">
      <v-text-field
        v-model="form.currentPassword"
        label="Password saat ini"
        type="password"
        autocomplete="current-password"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-text-field
        v-model="form.newPassword"
        label="Password baru"
        type="password"
        autocomplete="new-password"
        hint="Minimal 8 karakter"
        persistent-hint
        :rules="[rules.length(8, 128)]"
        class="mb-2"
      />
      <v-text-field
        v-model="form.repeat"
        label="Ulangi password baru"
        type="password"
        autocomplete="new-password"
        :rules="[sameAsNew]"
        class="mb-4"
      />
      <div class="d-flex justify-end ga-2">
        <v-btn to="/" variant="text">Batal</v-btn>
        <v-btn type="submit" color="primary" :loading="loading">Simpan password</v-btn>
      </div>
    </v-form>
  </v-card>
</template>