<script setup lang="ts">
import type { SubmitEventPromise } from 'vuetify'
import { useUiStore } from '~/stores/ui'
import { useProductsService } from '~/services/products'

const ui = useUiStore()
const productsService = useProductsService()
const form = ref(emptyForm())
const saving = ref(false)
const error = ref('')

async function save(event: SubmitEventPromise) {
  if (!(await event).valid) return
  saving.value = true
  error.value = ''
  try {
    const { data } = await productsService.create(toInput(form.value))
    ui.notify('Produk ditambahkan.')
    await navigateTo(`/products/${data.id}`)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/products" class="d-inline-flex align-center ga-1 mb-3 text-body-2">
      <v-icon icon="mdi-arrow-left" size="18" /> Kembali ke daftar produk
    </NuxtLink>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <h1 class="text-h5">Tambah produk</h1>
      <div class="d-flex ga-2">
        <v-btn to="/products" variant="text">Batal</v-btn>
        <v-btn type="submit" form="product-form" color="primary" prepend-icon="mdi-check" :loading="saving">Simpan</v-btn>
      </div>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />
    <v-card class="pa-6">
      <v-form id="product-form" @submit.prevent="save">
        <ProductForm v-model="form" mode="create" />
      </v-form>
    </v-card>
  </div>
</template>