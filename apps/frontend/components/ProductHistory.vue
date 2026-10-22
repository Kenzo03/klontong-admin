<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { HistoryEntry } from '~/types/api'

defineProps<{ entries: HistoryEntry[] }>()
const { xs } = useDisplay()
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title>Riwayat perubahan</v-card-title>
      <v-card-subtitle>{{ entries.length }} entri terbaru</v-card-subtitle>
    </v-card-item>

    <v-card-text v-if="!entries.length" class="text-medium-emphasis">
      Belum ada riwayat. Produk dari data awal (seeder) baru punya riwayat setelah pertama kali diubah.
    </v-card-text>

    <!-- Phones: one block per entry (PRD 8) -->
    <template v-else-if="xs">
      <div v-for="e in entries" :key="e.id" class="px-4 py-3 border-t">
        <div class="d-flex align-center justify-space-between mb-1">
          <v-chip size="small" variant="tonal" :color="HISTORY_ACTION[e.action].color">{{ HISTORY_ACTION[e.action].label }}</v-chip>
          <span class="text-caption text-medium-emphasis">{{ formatDateTime(e.createdAt) }}</span>
        </div>
        <div class="text-body-2 text-medium-emphasis mb-1">{{ e.actor.name }} · {{ ROLE_LABEL[e.actor.role] }}</div>
        <div v-for="line in historyChanges(e)" :key="line" class="text-body-2">{{ line }}</div>
        <div v-if="e.reason" class="text-body-2 text-medium-emphasis mt-1">Alasan: {{ e.reason }}</div>
      </div>
    </template>

    <v-table v-else>
      <thead>
        <tr>
          <th>Waktu</th>
          <th>Oleh</th>
          <th>Aksi</th>
          <th>Perubahan</th>
          <th>Alasan</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in entries" :key="e.id" style="vertical-align: top">
          <td class="text-no-wrap py-3">{{ formatDateTime(e.createdAt) }}</td>
          <td class="py-3">
            {{ e.actor.name }}
            <div class="text-caption text-medium-emphasis">{{ ROLE_LABEL[e.actor.role] }}</div>
          </td>
          <td class="py-3">
            <v-chip size="small" variant="tonal" :color="HISTORY_ACTION[e.action].color">{{ HISTORY_ACTION[e.action].label }}</v-chip>
          </td>
          <td class="py-3">
            <div v-for="line in historyChanges(e)" :key="line">{{ line }}</div>
          </td>
          <td class="py-3 text-medium-emphasis">{{ e.reason || '—' }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>