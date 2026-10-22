<script setup lang="ts">
import type { SubmitEventPromise } from 'vuetify'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'blank', public: true })

const auth = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const alert = ref<{ text: string; type: 'error' | 'warning' | 'info' } | null>(null)
const ALERT_TYPE: Record<string, 'warning' | 'info'> = { ACCOUNT_PENDING: 'warning', ACCOUNT_INACTIVE: 'info' }

async function submit(event: SubmitEventPromise) {
  if (!(await event).valid) return
  loading.value = true
  alert.value = null
  try {
    await auth.login(email.value, password.value)
    const redirect = route.query.redirect
    // Only same-site paths: "//evil.com" would be another site
    await navigateTo(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/')
  } catch (e) {
    alert.value = { text: errorMessage(e), type: ALERT_TYPE[errorCode(e) ?? ''] ?? 'error' }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card class="pa-6" width="100%" max-width="420">
    <div class="d-flex flex-column align-center text-center ga-2 mb-6">
      <v-avatar color="primary" size="56"><v-icon icon="mdi-cart-outline" size="30" /></v-avatar>
      <h1 class="text-h5 font-weight-medium">Klontong Admin</h1>
      <p class="text-body-2 text-medium-emphasis">Masuk untuk mengelola produk toko</p>
    </div>
    <v-alert v-if="alert" :type="alert.type" variant="tonal" class="mb-4" :text="alert.text" />
    <v-form @submit.prevent="submit">
      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        autocomplete="username"
        placeholder="nama@klontong.test"
        :rules="[rules.required, rules.email]"
        class="mb-2"
      />
      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        autocomplete="current-password"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-btn type="submit" color="primary" size="large" block :loading="loading">Masuk</v-btn>
    </v-form>
    <p class="text-center text-body-2 text-medium-emphasis mt-6">
      Belum punya akun? <NuxtLink to="/register">Daftar</NuxtLink>
    </p>
  </v-card>
</template>