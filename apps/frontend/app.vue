<script setup lang="ts">
import { useUiStore } from '~/stores/ui'

const ui = useUiStore()
</script>

<template>
  <v-app>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <v-snackbar :model-value="!!ui.notice" :color="ui.notice?.color" @update:model-value="ui.notice = null">
      {{ ui.notice?.text }}
      <template #actions>
        <v-btn variant="text" @click="ui.notice = null">Tutup</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>