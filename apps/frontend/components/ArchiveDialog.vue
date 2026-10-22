<script setup lang="ts">
// Open while `name` is set. Used by the list and the detail page.
defineProps<{ name: string | null; loading?: boolean }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <v-dialog :model-value="!!name" max-width="440" @update:model-value="$emit('cancel')">
    <v-card title="Arsipkan produk?">
      <v-card-text>{{ name }} akan disembunyikan dari daftar. Admin bisa memulihkannya lewat filter Diarsipkan.</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">Batal</v-btn>
        <v-btn color="error" variant="flat" :loading="loading" @click="$emit('confirm')">Arsipkan</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>