<script setup lang="ts">
import type { SubmitEventPromise } from 'vuetify'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'
import { useProductsService } from '~/services/products'
import type { HistoryEntry, Product } from '~/types/api'

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const productsService = useProductsService()
const id = Number(route.params.id)

const product = ref<Product | null>(null)
const history = ref<HistoryEntry[]>([])
const form = ref(emptyForm())
const state = ref<'loading' | 'ready' | 'notFound' | 'error'>('loading')
const saving = ref(false)
const error = ref('')
const askArchive = ref(false)
const busy = ref(false)

// Edit mode lives in the URL (?edit=1), so "Ubah" in the list opens it directly. Archived products are read-only.
const editing = computed(() => route.query.edit === '1' && !!product.value && !product.value.archivedAt)

function show(p: Product) {
  product.value = p
  form.value = toForm(p)
}

async function load() {
  state.value = 'loading'
  try {
    const [p, h] = await Promise.all([productsService.get(id), productsService.history(id)])
    show(p.data)
    history.value = h.data
    state.value = 'ready'
  } catch (e) {
    // STAFF also get 404 for archived products (PRD 6.2)
    state.value = errorCode(e) === 'PRODUCT_NOT_FOUND' ? 'notFound' : 'error'
  }
}
onMounted(load)

const startEdit = () => navigateTo({ query: { edit: '1' } }, { replace: true })

function cancelEdit() {
  if (product.value) form.value = toForm(product.value)
  error.value = ''
  return navigateTo({ query: {} }, { replace: true })
}

async function save(event: SubmitEventPromise) {
  if (!editing.value || !(await event).valid) return // Enter in a read-only field must not save
  saving.value = true
  error.value = ''
  try {
    const { data } = await productsService.update(id, { ...toInput(form.value), reason: form.value.reason.trim() || undefined })
    show(data)
    history.value = (await productsService.history(id)).data
    ui.notify('Perubahan disimpan.')
    await navigateTo({ query: {} }, { replace: true })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

async function archive() {
  busy.value = true
  try {
    await productsService.archive(id)
    ui.notify('Produk diarsipkan.')
    await navigateTo('/products')
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
    askArchive.value = false
  }
}

async function restore() {
  busy.value = true
  try {
    show((await productsService.restore(id)).data)
    history.value = (await productsService.history(id)).data
    ui.notify('Produk dipulihkan. Aktifkan lagi jika ingin dijual.')
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/products" class="d-inline-flex align-center ga-1 mb-3 text-body-2">
      <v-icon icon="mdi-arrow-left" size="18" /> Kembali ke daftar produk
    </NuxtLink>

    <v-skeleton-loader v-if="state === 'loading'" type="heading, image, article" />

    <v-card v-else-if="state === 'notFound'" class="pa-8 text-center">
      <v-icon icon="mdi-package-variant-remove" size="48" color="secondary" />
      <h1 class="text-h6 mt-3">Produk tidak ditemukan</h1>
      <p class="text-body-2 text-medium-emphasis">Produk ini tidak ada atau sudah diarsipkan.</p>
    </v-card>

    <v-alert v-else-if="state === 'error'" type="error" variant="tonal" text="Gagal memuat produk.">
      <template #append>
        <v-btn variant="text" @click="load">Coba lagi</v-btn>
      </template>
    </v-alert>

    <template v-else-if="product">
      <v-alert v-if="product.archivedAt" type="warning" variant="tonal" icon="mdi-archive-outline" class="mb-4">
        Produk ini diarsipkan pada {{ formatDate(product.archivedAt) }} oleh {{ product.updatedBy.name }} dan tidak tampil di daftar.
        <template v-if="auth.isAdmin" #append>
          <v-btn variant="text" prepend-icon="mdi-restore" :loading="busy" @click="restore">Pulihkan</v-btn>
        </template>
      </v-alert>

      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
        <div class="d-flex flex-wrap align-center ga-2">
          <h1 class="text-h5">{{ product.name }}</h1>
          <v-chip size="small" variant="outlined">{{ product.sku }}</v-chip>
          <v-chip size="small" variant="tonal" :color="productStatus(product).color">{{ productStatus(product).label }}</v-chip>
        </div>
        <div v-if="editing" class="d-flex ga-2">
          <v-btn variant="text" @click="cancelEdit">Batal</v-btn>
          <v-btn type="submit" form="product-form" color="primary" prepend-icon="mdi-check" :loading="saving">Simpan</v-btn>
        </div>
        <div v-else-if="!product.archivedAt" class="d-flex ga-2">
          <v-btn v-if="auth.isAdmin" variant="outlined" color="error" prepend-icon="mdi-archive-outline" @click="askArchive = true">
            Arsipkan
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-pencil-outline" @click="startEdit">Ubah</v-btn>
        </div>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />

      <v-card class="pa-6 mb-4">
        <v-form id="product-form" :readonly="!editing" @submit.prevent="save">
          <ProductForm v-model="form" :mode="editing ? 'edit' : 'view'" />
        </v-form>
      </v-card>

      <ProductHistory :entries="history" />
      <ArchiveDialog :name="askArchive ? product.name : null" :loading="busy" @confirm="archive" @cancel="askArchive = false" />
    </template>
  </div>
</template>