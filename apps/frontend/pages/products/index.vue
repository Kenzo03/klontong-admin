<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'
import { useProductsService, type ProductQuery } from '~/services/products'
import type { Category, Product } from '~/types/api'

type Option = { value: string; title: string }
type FilterKey = 'categoryId' | 'status' | 'sort'

const SORTS: Option[] = [
  { value: 'updatedAt:desc', title: 'Terakhir diubah' },
  { value: 'name:asc', title: 'Nama A–Z' },
  { value: 'category:asc', title: 'Kategori A–Z' },
  { value: 'price:asc', title: 'Harga terendah' },
  { value: 'price:desc', title: 'Harga tertinggi' },
  { value: 'stock:asc', title: 'Stok terendah' },
]
const headers = [
  { title: '', key: 'image', sortable: false, width: 72 },
  { title: 'SKU', key: 'sku', sortable: false },
  { title: 'Nama', key: 'name', sortable: false },
  { title: 'Kategori', key: 'categoryName', sortable: false },
  { title: 'Harga', key: 'price', sortable: false, align: 'end' as const },
  { title: 'Stok', key: 'stock', sortable: false, align: 'end' as const },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Aksi', key: 'actions', sortable: false },
]

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const productsService = useProductsService()
const { xs } = useDisplay()

// PRD 6.1: the URL is the single source of truth for search, filters, sort and page,
// so refresh, Back and a shared link all show the same view.
const text = (v: unknown) => (typeof v === 'string' ? v : '')
const q = computed(() => ({
  search: text(route.query.search),
  categoryId: text(route.query.categoryId),
  status: text(route.query.status),
  sort: text(route.query.sort) || SORTS[0]!.value,
  page: Number(route.query.page) || 1,
  pageSize: Number(route.query.pageSize) || 10,
}))
const hasFilters = computed(() => !!(q.value.search || q.value.categoryId || q.value.status))

// One click can change two values (a new page size also resets the page), so changes made
// in the same tick are collected and written to the URL once.
let pending: Record<string, string | number | undefined> | null = null
function setQuery(patch: Record<string, string | number | undefined>) {
  if (pending) {
    Object.assign(pending, patch)
    return
  }
  pending = { ...patch }
  nextTick(() => {
    const merged: Record<string, unknown> = { ...route.query, ...pending }
    pending = null
    // leave out empty values so URLs stay short
    const query = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>
    navigateTo({ query }, { replace: true })
  })
}
const setFilter = (key: FilterKey, value: string) => setQuery({ [key]: value, page: undefined })

const categories = ref<Category[]>([])
const categoryItems = computed<Option[]>(() => [
  { value: '', title: 'Semua kategori' },
  ...categories.value.map((c) => ({ value: String(c.id), title: c.name })),
])
const statusItems = computed<Option[]>(() => [
  { value: '', title: 'Semua status' },
  { value: 'active', title: 'Aktif' },
  { value: 'inactive', title: 'Nonaktif' },
  ...(auth.isAdmin ? [{ value: 'archived', title: 'Diarsipkan' }] : []),
])
onMounted(async () => {
  try {
    categories.value = (await productsService.categories()).data
  } catch {
    // the filter then offers only "Semua kategori"
  }
})

// Search: the URL (and so the request) updates 300 ms after the last key press, not on every key
const searchInput = ref<string | null>(q.value.search)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => setQuery({ search: (v ?? '').trim(), page: undefined }), 300)
})

function resetFilters() {
  searchInput.value = ''
  setQuery({ search: undefined, categoryId: undefined, status: undefined, page: undefined })
}

const rows = ref<Product[]>([])
const total = ref(0)
const loading = ref(true)
const loadFailed = ref(false)

async function load() {
  loading.value = true
  loadFailed.value = false
  const [sort, order] = q.value.sort.split(':')
  try {
    const res = await productsService.list({
      page: q.value.page,
      pageSize: q.value.pageSize,
      search: q.value.search || undefined,
      categoryId: q.value.categoryId ? Number(q.value.categoryId) : undefined,
      status: (q.value.status || undefined) as ProductQuery['status'],
      sort,
      order: order as 'asc' | 'desc',
    })
    rows.value = res.data
    total.value = res.meta.total
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
watch(() => route.query, load, { immediate: true })

// Phones: filter chips open one bottom sheet with the options (PRD 8)
const sheet = ref<FilterKey | null>(null)
const sheets = computed(() => ({
  categoryId: { title: 'Kategori', items: categoryItems.value },
  status: { title: 'Status', items: statusItems.value },
  sort: { title: 'Urutkan', items: SORTS },
}))
const titleOf = (items: Option[], value: string) => items.find((i) => i.value === value)?.title ?? ''
function pick(value: string) {
  if (sheet.value) setFilter(sheet.value, value)
  sheet.value = null
}

const archiving = ref<Product | null>(null)
const busy = ref(false)

async function confirmArchive() {
  if (!archiving.value) return
  busy.value = true
  try {
    await productsService.archive(archiving.value.id)
    ui.notify('Produk diarsipkan.')
    archiving.value = null
    await load()
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    busy.value = false
  }
}

async function restore(p: Product) {
  try {
    await productsService.restore(p.id)
    ui.notify(`${p.name} dipulihkan. Aktifkan lagi jika ingin dijual.`)
    await load()
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  }
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div class="d-flex align-baseline ga-3">
        <h1 class="text-h5">Produk</h1>
        <span class="text-body-2 text-medium-emphasis">{{ formatNumber(total) }} produk</span>
      </div>
      <v-btn v-if="!xs" to="/products/new" color="primary" prepend-icon="mdi-plus">Tambah produk</v-btn>
    </div>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="searchInput"
            label="Cari"
            placeholder="Nama produk atau SKU"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          />
        </v-col>
        <template v-if="!xs">
          <v-col cols="12" sm="4" md="2">
            <v-select
              :model-value="q.categoryId"
              :items="categoryItems"
              label="Kategori"
              hide-details
              @update:model-value="(v) => setFilter('categoryId', v)"
            />
          </v-col>
          <v-col cols="12" sm="4" md="2">
            <v-select
              :model-value="q.status"
              :items="statusItems"
              label="Status"
              hide-details
              @update:model-value="(v) => setFilter('status', v)"
            />
          </v-col>
          <v-col cols="12" sm="4" md="2">
            <v-select :model-value="q.sort" :items="SORTS" label="Urutkan" hide-details @update:model-value="(v) => setFilter('sort', v)" />
          </v-col>
        </template>
      </v-row>
      <div v-if="xs" class="d-flex ga-2 overflow-x-auto mt-3">
        <v-chip append-icon="mdi-chevron-down" variant="outlined" @click="sheet = 'categoryId'">
          Kategori: {{ q.categoryId ? titleOf(categoryItems, q.categoryId) : 'Semua' }}
        </v-chip>
        <v-chip append-icon="mdi-chevron-down" variant="outlined" @click="sheet = 'status'">
          Status: {{ q.status ? titleOf(statusItems, q.status) : 'Semua' }}
        </v-chip>
        <v-chip append-icon="mdi-chevron-down" variant="outlined" @click="sheet = 'sort'">{{ titleOf(SORTS, q.sort) }}</v-chip>
      </div>
    </v-card>

    <v-alert v-if="loadFailed" type="error" variant="tonal" class="mb-4" text="Gagal memuat produk. Periksa koneksi internet, lalu coba lagi.">
      <template #append>
        <v-btn variant="text" prepend-icon="mdi-refresh" @click="load">Coba lagi</v-btn>
      </template>
    </v-alert>

    <v-card>
      <!-- Empty: different message when filters hide everything vs. no products at all -->
      <div v-if="!loading && !loadFailed && !rows.length" class="pa-12 text-center">
        <v-icon icon="mdi-package-variant" size="48" color="secondary" />
        <template v-if="hasFilters">
          <p class="text-h6 mt-2">Tidak ada produk yang cocok</p>
          <p class="text-body-2 text-medium-emphasis">Coba kata kunci lain atau reset filter.</p>
          <v-btn variant="outlined" class="mt-4" @click="resetFilters">Reset filter</v-btn>
        </template>
        <template v-else>
          <p class="text-h6 mt-2">Belum ada produk</p>
          <p class="text-body-2 text-medium-emphasis">Tambahkan produk pertama toko Anda.</p>
          <v-btn to="/products/new" color="primary" class="mt-4">Tambah produk</v-btn>
        </template>
      </div>

      <!-- Phones: a list with a ⋮ menu per row (PRD 8) -->
      <template v-else-if="xs">
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <v-skeleton-loader v-if="loading && !rows.length" type="list-item-avatar-two-line@5" />
        <v-list v-else lines="three">
          <v-list-item v-for="p in rows" :key="p.id" @click="navigateTo(`/products/${p.id}`)">
            <template #prepend>
              <ProductImage :src="p.image" :size="56" class="me-3" />
            </template>
            <v-list-item-title>{{ p.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ p.sku }} · {{ p.categoryName }}</v-list-item-subtitle>
            <div class="d-flex flex-wrap align-center ga-2 text-body-2 mt-1">
              <span class="font-weight-medium">{{ formatRupiah(p.price) }}</span>
              <span v-if="p.stock === 0" class="text-error font-weight-medium">Stok habis</span>
              <span v-else>{{ formatNumber(p.stock) }} {{ UOM_LABEL[p.uom] }}</span>
              <v-chip v-if="!p.isActive" size="x-small" :color="productStatus(p).color">{{ productStatus(p).label }}</v-chip>
            </div>
            <template #append>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" aria-label="Aksi lain" @click.stop />
                </template>
                <v-list>
                  <v-list-item :to="`/products/${p.id}`" title="Lihat" />
                  <v-list-item v-if="!p.archivedAt" :to="`/products/${p.id}?edit=1`" title="Ubah" />
                  <template v-if="auth.isAdmin">
                    <v-list-item v-if="p.archivedAt" title="Pulihkan" @click="restore(p)" />
                    <v-list-item v-else title="Arsipkan" base-color="error" @click="archiving = p" />
                  </template>
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
        <v-pagination
          v-if="total > q.pageSize"
          :model-value="q.page"
          :length="Math.ceil(total / q.pageSize)"
          :total-visible="5"
          @update:model-value="(p) => setQuery({ page: p > 1 ? p : undefined })"
        />
      </template>

      <!-- Desktop: server-side table -->
      <v-data-table-server
        v-else
        :headers="headers"
        :items="rows"
        :items-length="total"
        :loading="loading"
        :page="q.page"
        :items-per-page="q.pageSize"
        :items-per-page-options="[10, 20, 50]"
        @update:page="(p) => setQuery({ page: p > 1 ? p : undefined })"
        @update:items-per-page="(n) => setQuery({ pageSize: n === 10 ? undefined : n, page: undefined })"
      >
        <template #loading>
          <v-skeleton-loader type="table-row@5" />
        </template>
        <template #item.image="{ item }">
          <ProductImage :src="item.image" :size="40" />
        </template>
        <template #item.name="{ item }">
          <NuxtLink :to="`/products/${item.id}`" class="text-high-emphasis text-decoration-none">{{ item.name }}</NuxtLink>
        </template>
        <template #item.price="{ item }">{{ formatRupiah(item.price) }}</template>
        <template #item.stock="{ item }">
          <span :class="{ 'text-error font-weight-medium': item.stock === 0 }">
            {{ formatNumber(item.stock) }} {{ UOM_LABEL[item.uom] }}
          </span>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" variant="tonal" :color="productStatus(item).color">{{ productStatus(item).label }}</v-chip>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex">
            <v-btn icon="mdi-eye-outline" variant="text" size="small" :to="`/products/${item.id}`" aria-label="Lihat" title="Lihat" />
            <v-btn
              v-if="!item.archivedAt"
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              :to="`/products/${item.id}?edit=1`"
              aria-label="Ubah"
              title="Ubah"
            />
            <template v-if="auth.isAdmin">
              <v-btn v-if="item.archivedAt" icon="mdi-restore" variant="text" size="small" aria-label="Pulihkan" title="Pulihkan" @click="restore(item)" />
              <v-btn
                v-else
                icon="mdi-archive-outline"
                variant="text"
                size="small"
                color="error"
                aria-label="Arsipkan"
                title="Arsipkan"
                @click="archiving = item"
              />
            </template>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <v-btn
      v-if="xs"
      to="/products/new"
      icon="mdi-plus"
      color="primary"
      size="large"
      position="fixed"
      location="bottom end"
      class="ma-4"
      aria-label="Tambah produk"
    />

    <v-bottom-sheet :model-value="!!sheet" @update:model-value="sheet = null">
      <v-list v-if="sheet">
        <v-list-subheader>{{ sheets[sheet].title }}</v-list-subheader>
        <v-list-item
          v-for="o in sheets[sheet].items"
          :key="o.value"
          :title="o.title"
          :active="q[sheet] === o.value"
          color="primary"
          @click="pick(o.value)"
        />
      </v-list>
    </v-bottom-sheet>

    <ArchiveDialog :name="archiving?.name ?? null" :loading="busy" @confirm="confirmArchive" @cancel="archiving = null" />
  </div>
</template>