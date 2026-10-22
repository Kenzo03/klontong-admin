<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'
import { useUsersService } from '~/services/users'

const auth = useAuthStore()
const ui = useUiStore()
const usersService = useUsersService()
const { xs } = useDisplay() // phone width (< 600 px)
const drawer = ref(false)
const roleLabel = computed(() => (auth.isAdmin ? 'Admin' : 'Staf'))

onMounted(async () => {
  if (!auth.isAdmin) return
  try {
    ui.pendingUsers = (await usersService.list({ status: 'PENDING', pageSize: 1 })).meta.total
  } catch {
    // the badge is only a hint; the Pengguna page shows its own errors
  }
})

async function logout() {
  await auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <v-app-bar color="primary">
      <v-app-bar-nav-icon v-if="xs" aria-label="Buka menu" @click="drawer = !drawer" />
      <NuxtLink to="/" class="d-flex align-center ga-2 text-white text-decoration-none mx-4">
        <v-icon icon="mdi-cart-outline" size="28" />
        <span v-if="!xs" class="text-h6">Klontong Admin</span>
      </NuxtLink>
      <template v-if="!xs">
        <v-btn to="/products" height="64" rounded="0">Produk</v-btn>
        <v-btn v-if="auth.isAdmin" to="/users" height="64" rounded="0">
          Pengguna
          <v-badge v-if="ui.pendingUsers" :content="ui.pendingUsers" color="warning" inline />
        </v-btn>
      </template>
      <v-spacer />
      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="text-none me-2" height="48" aria-label="Menu akun">
            <v-avatar color="sage-light" size="32" class="text-body-2">{{ initials(auth.user?.name ?? '') }}</v-avatar>
            <span v-if="!xs" class="ms-2 text-start">
              <span class="d-block text-body-2 font-weight-medium">{{ auth.user?.name }}</span>
              <span class="d-block text-caption">{{ roleLabel }}</span>
            </span>
            <v-icon v-if="!xs" icon="mdi-chevron-down" end />
          </v-btn>
        </template>
        <v-list min-width="220">
          <v-list-item to="/change-password" prepend-icon="mdi-lock-outline" title="Ganti password" />
          <v-list-item prepend-icon="mdi-logout" title="Keluar" @click="logout" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-if="xs" v-model="drawer" temporary>
      <v-list nav>
        <v-list-item :title="auth.user?.name" :subtitle="roleLabel" />
        <v-divider class="mb-2" />
        <v-list-item to="/products" prepend-icon="mdi-package-variant-closed" title="Produk" />
        <v-list-item v-if="auth.isAdmin" to="/users" prepend-icon="mdi-account-multiple-outline" title="Pengguna">
          <template #append>
            <v-badge v-if="ui.pendingUsers" :content="ui.pendingUsers" color="warning" inline />
          </template>
        </v-list-item>
        <v-list-item to="/change-password" prepend-icon="mdi-lock-outline" title="Ganti password" />
        <v-list-item prepend-icon="mdi-logout" title="Keluar" @click="logout" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container class="py-6" style="max-width: 1200px">
        <slot />
      </v-container>
    </v-main>
  </div>
</template>