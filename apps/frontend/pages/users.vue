<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useUiStore } from '~/stores/ui'
import { useUsersService, type UserUpdate } from '~/services/users'
import type { Role, User, UserStatus } from '~/types/api'

type Filter = UserStatus | 'ALL'
type Action = 'approve' | 'role' | 'reject' | 'deactivate'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
  { value: 'REJECTED', label: 'Ditolak' },
]
const STATUS_CHIP: Record<UserStatus, { label: string; color: string }> = {
  PENDING: { label: 'Menunggu', color: 'warning' },
  ACTIVE: { label: 'Aktif', color: 'primary' },
  INACTIVE: { label: 'Nonaktif', color: 'grey' },
  REJECTED: { label: 'Ditolak', color: 'error' },
}
const DIALOG: Record<Action, { title: string; cta: string; color: string }> = {
  approve: { title: 'Setujui', cta: 'Setujui', color: 'primary' },
  role: { title: 'Ubah peran', cta: 'Simpan', color: 'primary' },
  reject: { title: 'Tolak pendaftaran', cta: 'Tolak', color: 'error' },
  deactivate: { title: 'Nonaktifkan', cta: 'Nonaktifkan', color: 'error' },
}
const headers = [
  { title: 'Nama', key: 'name', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Peran', key: 'role', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Terdaftar', key: 'createdAt', sortable: false },
  { title: 'Aksi', key: 'actions', sortable: false },
]

const auth = useAuthStore()
const usersService = useUsersService()
const ui = useUiStore()

const filter = ref<Filter>('ALL')
const page = ref(1)
const itemsPerPage = ref(10)
const rows = ref<User[]>([])
const total = ref(0)
const counts = ref<Partial<Record<UserStatus, number>>>({})
const loading = ref(false)
const loadFailed = ref(false)

const roleLabel = (role: Role) => (role === 'ADMIN' ? 'Admin' : 'Staf')
// "Semua" = everyone except rejected, the same rule as the API
const countOf = (f: Filter) =>
  f === 'ALL' ? (counts.value.PENDING ?? 0) + (counts.value.ACTIVE ?? 0) + (counts.value.INACTIVE ?? 0) : (counts.value[f] ?? 0)

async function load() {
  if (!auth.isAdmin) return // STAFF see the 403 card; don't even call the API
  loading.value = true
  loadFailed.value = false
  try {
    const res = await usersService.list({
      status: filter.value === 'ALL' ? undefined : filter.value,
      page: page.value,
      pageSize: itemsPerPage.value,
    })
    rows.value = res.data
    total.value = res.meta.total
    counts.value = res.meta.counts
    ui.pendingUsers = res.meta.counts.PENDING ?? 0
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
watch(filter, () => (page.value = 1))
watch([filter, page, itemsPerPage], load, { immediate: true })

const dialog = ref<{ action: Action; user: User } | null>(null)
const pickedRole = ref<Role>('STAFF')
const saving = ref(false)

function openDialog(action: Action, user: User) {
  pickedRole.value = action === 'role' ? user.role : 'STAFF'
  dialog.value = { action, user }
}

async function save(user: User, change: UserUpdate, message: string) {
  saving.value = true
  try {
    await usersService.update(user.id, change)
    ui.notify(message)
    dialog.value = null
    await load()
  } catch (e) {
    ui.notify(errorMessage(e), 'error')
  } finally {
    saving.value = false
  }
}

function confirmDialog() {
  if (!dialog.value) return
  const { action, user } = dialog.value
  const role = pickedRole.value
  if (action === 'approve') return save(user, { status: 'ACTIVE', role }, `${user.name} disetujui sebagai ${roleLabel(role)}.`)
  if (action === 'role') return save(user, { role }, `Peran ${user.name} diubah menjadi ${roleLabel(role)}.`)
  if (action === 'reject') return save(user, { status: 'REJECTED' }, `Pendaftaran ${user.name} ditolak. Lihat di filter Ditolak.`)
  return save(user, { status: 'INACTIVE' }, `${user.name} dinonaktifkan. Sesi aktifnya langsung berakhir.`)
}
</script>

<template>
  <div>
    <v-card v-if="!auth.isAdmin" max-width="560" class="mx-auto mt-10 pa-8 text-center" role="alert">
      <v-icon icon="mdi-lock-outline" size="48" color="primary" />
      <h1 class="text-h6 mt-3">Anda tidak punya akses ke halaman ini</h1>
      <p class="text-body-2 text-medium-emphasis mt-2">Halaman Pengguna hanya untuk admin toko.</p>
      <v-btn to="/products" variant="text" class="mt-4">Kembali ke daftar produk</v-btn>
    </v-card>

    <template v-else>
      <div class="d-flex flex-wrap align-baseline ga-3 mb-4">
        <h1 class="text-h5">Pengguna</h1>
        <span class="text-body-2 text-medium-emphasis">Akun baru dari halaman Daftar menunggu persetujuan di sini</span>
      </div>

      <v-chip-group v-model="filter" mandatory selected-class="text-primary" class="mb-2" aria-label="Saring status">
        <v-chip v-for="f in FILTERS" :key="f.value" :value="f.value" filter variant="outlined">
          {{ f.label }} ({{ countOf(f.value) }})
        </v-chip>
      </v-chip-group>

      <v-alert v-if="loadFailed" type="error" variant="tonal" class="mb-4" text="Gagal memuat pengguna.">
        <template #append>
          <v-btn variant="text" @click="load">Coba lagi</v-btn>
        </template>
      </v-alert>

      <v-card>
        <v-data-table-server
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="rows"
          :items-length="total"
          :items-per-page-options="[10, 20, 50]"
          :loading="loading"
          mobile-breakpoint="sm"
          loading-text="Memuat pengguna…"
          no-data-text="Tidak ada pengguna di filter ini"
        >
          <template #item.name="{ item }">
            <div class="d-flex align-center ga-2">
              <v-avatar color="sage-light" size="32" class="text-body-2">{{ initials(item.name) }}</v-avatar>
              <span>
                {{ item.name }}
                <span v-if="item.id === auth.user?.id" class="text-medium-emphasis">(Anda)</span>
              </span>
            </div>
          </template>
          <template #item.role="{ item }">
            {{ item.status === 'PENDING' || item.status === 'REJECTED' ? '—' : roleLabel(item.role) }}
          </template>
          <template #item.status="{ item }">
            <v-chip :color="STATUS_CHIP[item.status].color" size="small" variant="tonal">{{ STATUS_CHIP[item.status].label }}</v-chip>
          </template>
          <template #item.createdAt="{ item }">{{ formatDate(item.createdAt) }}</template>
          <template #item.actions="{ item }">
            <span v-if="item.id === auth.user?.id" class="text-body-2 text-medium-emphasis">
              <v-icon icon="mdi-lock-outline" size="16" /> Akun Anda tidak bisa diubah di sini
            </span>
            <template v-else-if="item.status === 'PENDING'">
              <v-btn size="small" color="primary" variant="flat" class="me-1" @click="openDialog('approve', item)">Setujui</v-btn>
              <v-btn size="small" color="error" variant="text" @click="openDialog('reject', item)">Tolak</v-btn>
            </template>
            <template v-else-if="item.status === 'ACTIVE'">
              <v-btn size="small" variant="text" @click="openDialog('role', item)">Ubah peran</v-btn>
              <v-btn size="small" color="error" variant="text" @click="openDialog('deactivate', item)">Nonaktifkan</v-btn>
            </template>
            <v-btn
              v-else-if="item.status === 'INACTIVE'"
              size="small"
              variant="text"
              :loading="saving"
              @click="save(item, { status: 'ACTIVE' }, `${item.name} aktif kembali.`)"
            >
              Aktifkan kembali
            </v-btn>
            <v-btn v-else size="small" variant="text" @click="openDialog('approve', item)">Setujui</v-btn>
          </template>
        </v-data-table-server>
      </v-card>
      <p class="text-caption text-medium-emphasis mt-3">
        Akun tidak bisa dihapus agar riwayat perubahan tetap utuh. Nonaktifkan akun yang sudah tidak dipakai.
      </p>

      <v-dialog :model-value="!!dialog" max-width="460" @update:model-value="dialog = null">
        <v-card v-if="dialog" :title="`${DIALOG[dialog.action].title} ${dialog.user.name}`" :subtitle="dialog.user.email">
          <v-card-text>
            <v-radio-group
              v-if="dialog.action === 'approve' || dialog.action === 'role'"
              v-model="pickedRole"
              label="Peran"
              hide-details
            >
              <v-radio value="STAFF" label="Staf: kelola produk; tidak bisa mengubah harga, stok, satuan, atau mengarsipkan" />
              <v-radio value="ADMIN" label="Admin: semua akses, termasuk harga, stok, arsip, dan pengguna" />
            </v-radio-group>
            <p v-else-if="dialog.action === 'reject'">
              Akun ini tidak bisa masuk, dan email-nya tidak bisa dipakai mendaftar lagi. Anda masih bisa menyetujuinya nanti dari filter Ditolak.
            </p>
            <p v-else>Akun ini langsung keluar dan tidak bisa masuk sampai diaktifkan kembali.</p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="dialog = null">Batal</v-btn>
            <v-btn :color="DIALOG[dialog.action].color" variant="flat" :loading="saving" @click="confirmDialog">
              {{ DIALOG[dialog.action].cta }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>