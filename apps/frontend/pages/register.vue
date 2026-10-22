<script setup lang="ts">
import type { SubmitEventPromise } from 'vuetify'
import { useAuthService } from '~/services/auth'

definePageMeta({ layout: 'blank', public: true })

const authService = useAuthService()
const form = reactive({ name: '', email: '', password: '', repeat: '' })
const loading = ref(false)
const error = ref('')
const done = ref(false)
const sameAsPassword = (v: string) => v === form.password || 'Password tidak sama'

async function submit(event: SubmitEventPromise) {
  if (!(await event).valid) return
  loading.value = true
  error.value = ''
  try {
    await authService.register({ name: form.name, email: form.email, password: form.password })
    done.value = true // the account is PENDING: no login yet
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card class="pa-6" width="100%" max-width="420">
    <div v-if="done" class="d-flex flex-column align-center text-center ga-3">
      <v-icon icon="mdi-check-circle-outline" color="primary" size="56" />
      <h1 class="text-h5 font-weight-medium">Pendaftaran terkirim</h1>
      <p class="text-body-1 text-medium-emphasis">
        Admin toko perlu menyetujui akun Anda dan memilih peran Anda. Setelah itu Anda bisa masuk.
      </p>
      <v-btn to="/login" variant="outlined" class="mt-2">Kembali ke halaman masuk</v-btn>
    </div>

    <template v-else>
      <div class="d-flex flex-column align-center text-center ga-2 mb-6">
        <v-avatar color="primary" size="56"><v-icon icon="mdi-cart-outline" size="30" /></v-avatar>
        <h1 class="text-h5 font-weight-medium">Daftar akun</h1>
        <p class="text-body-2 text-medium-emphasis">Akun baru perlu disetujui admin toko sebelum bisa dipakai</p>
      </div>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />
      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="form.name"
          label="Nama lengkap"
          autocomplete="name"
          placeholder="Budi Santoso"
          :rules="[rules.required, rules.length(1, 255)]"
          class="mb-2"
        />
        <v-text-field
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="nama@klontong.test"
          :rules="[rules.required, rules.email]"
          class="mb-2"
        />
        <v-text-field
          v-model="form.password"
          label="Password"
          type="password"
          autocomplete="new-password"
          hint="Minimal 8 karakter"
          persistent-hint
          :rules="[rules.length(8, 128)]"
          class="mb-2"
        />
        <v-text-field
          v-model="form.repeat"
          label="Ulangi password"
          type="password"
          autocomplete="new-password"
          :rules="[sameAsPassword]"
          class="mb-2"
        />
        <v-btn type="submit" color="primary" size="large" block :loading="loading">Daftar</v-btn>
      </v-form>
      <p class="text-center text-body-2 text-medium-emphasis mt-6">
        Sudah punya akun? <NuxtLink to="/login">Masuk</NuxtLink>
      </p>
    </template>
  </v-card>
</template>