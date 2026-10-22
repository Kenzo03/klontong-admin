<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useProductsService } from '~/services/products'
import type { Category } from '~/types/api'
import type { ProductFormValues } from '~/utils/product'

// view = read-only detail, edit = existing product, create = new product.
// The page owns <v-form> and the Simpan button; this component is only the fields.
const props = defineProps<{ mode: 'create' | 'view' | 'edit' }>()
const form = defineModel<ProductFormValues>({ required: true })

const auth = useAuthStore()
const productsService = useProductsService()
const categories = ref<Category[]>([])
onMounted(async () => {
  try {
    categories.value = (await productsService.categories()).data
  } catch {
    // the select stays empty; saving then fails with a visible message
  }
})

// PRD 6.2: STAFF edit everything except price, stock and unit. Creating is not editing, so create is never locked.
const locked = computed(() => props.mode === 'edit' && !auth.isAdmin)
const lockHint = computed(() => (locked.value ? 'Hanya admin yang dapat mengubah' : undefined))
const uomHint = computed(() =>
  locked.value
    ? lockHint.value
    : props.mode === 'edit'
      ? 'Ganti satuan wajib disertai harga, stok, dan alasan baru'
      : 'Harga dan stok dihitung per satuan ini',
)

// PRD 6.4: the image uploads as soon as it is picked; the form keeps only the returned path
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024
const fileInput = ref<HTMLInputElement>()
const uploading = ref('')
const uploadError = ref('')

function regroup(e: Event) {
  const el = e.target as HTMLInputElement
  const digitsBeforeCaret = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length
  const shown = groupThousands(el.value.replace(/\D/g, ''))
  el.value = shown
  let caret = 0
  for (let seen = 0; caret < shown.length && seen < digitsBeforeCaret; caret++) if (shown[caret] !== '.') seen++
  el.setSelectionRange(caret, caret)
}

function allowOnly(allowed: RegExp) {
  return (e: Event) => {
    const ev = e as InputEvent
    const text = ev.data ?? ev.dataTransfer?.getData('text') ?? '' // typing or pasting
    if (text && !allowed.test(text)) ev.preventDefault()
  }
}

const decimalOnly = allowOnly(/^[\d.,]+$/)

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // so picking the same file again still fires "change"
  if (!file) return
  uploadError.value = ''
  // Fast feedback only: the server checks the real type from the file's first bytes
  if (!IMAGE_TYPES.includes(file.type)) {
    uploadError.value = 'Gambar harus JPG, PNG, atau WebP.'
    return
  }
  if (file.size > MAX_BYTES) {
    uploadError.value = 'Ukuran gambar maksimal 2 MB. Pilih file lain.'
    return
  }
  uploading.value = file.name
  try {
    form.value.image = (await productsService.uploadImage(file)).data.url
  } catch (e) {
    uploadError.value = errorMessage(e)
  } finally {
    uploading.value = ''
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12" md="4">
      <ProductImage :src="form.image" :size="280" :alt="form.name" />
      <template v-if="mode !== 'view'">
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onFile">
        <div class="d-flex flex-wrap ga-2 mt-3">
          <v-btn variant="outlined" prepend-icon="mdi-upload" :loading="!!uploading" @click="fileInput?.click()">
            {{ form.image ? 'Ganti gambar' : 'Pilih gambar' }}
          </v-btn>
          <v-btn v-if="form.image" variant="text" color="error" @click="form.image = null">Hapus</v-btn>
        </div>
        <p v-if="uploading" class="text-body-2 mt-2" role="status">Mengunggah {{ uploading }}…</p>
        <p v-else-if="uploadError" class="text-body-2 text-error mt-2" role="alert">{{ uploadError }}</p>
        <p v-else class="text-caption text-medium-emphasis mt-2">Opsional. JPG, PNG, atau WebP. Maksimal 2 MB.</p>
      </template>
    </v-col>

    <v-col cols="12" md="8">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="form.sku"
            label="SKU"
            hint="Huruf besar, angka, dan tanda hubung"
            :rules="[rules.required, rules.sku]"
            @update:model-value="(v) => (form.sku = v.toUpperCase())"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="form.categoryId"
            :items="categories"
            item-title="name"
            item-value="id"
            label="Kategori"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field v-model="form.name" label="Nama produk" :rules="[rules.required, rules.length(1, 255)]" />
        </v-col>
        <v-col cols="12" sm="4">
          <v-select
            v-model="form.uom"
            :items="UOM_ITEMS"
            label="Satuan"
            :disabled="locked"
            :hint="uomHint"
            :persistent-hint="mode !== 'view'"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            :model-value="groupThousands(form.price)"
            label="Harga per satuan"
            prefix="Rp"
            inputmode="numeric"
            :disabled="locked"
            :hint="lockHint"
            persistent-hint
            :rules="[rules.int(0, 1_000_000_000)]"
            @update:model-value="(v) => (form.price = v.replace(/\D/g, ''))"
            @input="regroup"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            :model-value="groupThousands(form.stock)"
            :label="mode === 'create' ? 'Stok awal' : 'Stok'"
            :suffix="UOM_LABEL[form.uom]"
            inputmode="numeric"
            :disabled="locked"
            :hint="lockHint"
            persistent-hint
            :rules="[rules.int(0, 1_000_000)]"
            @update:model-value="(v) => (form.stock = v.replace(/\D/g, ''))"
            @input="regroup"
          />
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field v-model="form.weight" label="Berat (kg)" @beforeinput="decimalOnly" inputmode="decimal" :rules="[rules.decimal(0.0001, 100, 4)]" />
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field v-model="form.length" label="Panjang (cm)" @beforeinput="decimalOnly" inputmode="decimal" :rules="[rules.decimal(0.01, 500, 2)]" />
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field v-model="form.width" label="Lebar (cm)" @beforeinput="decimalOnly" inputmode="decimal" :rules="[rules.decimal(0.01, 500, 2)]" />
        </v-col>
        <v-col cols="6" sm="3">
          <v-text-field v-model="form.height" label="Tinggi (cm)" @beforeinput="decimalOnly" inputmode="decimal" :rules="[rules.decimal(0.01, 500, 2)]" />
        </v-col>
        <v-col cols="12">
          <v-textarea v-model="form.description" label="Deskripsi" rows="2" auto-grow :rules="[rules.max(2000)]" />
        </v-col>
        <v-col cols="12">
          <v-switch
            v-model="form.isActive"
            label="Aktif dijual"
            color="primary"
            inset
            hint="Nonaktif = tidak dijual, tetap tampil di daftar"
            persistent-hint
          />
        </v-col>
        <v-col v-if="mode === 'edit'" cols="12">
          <v-textarea
            v-model="form.reason"
            :label="auth.isAdmin ? 'Alasan perubahan' : 'Alasan perubahan (opsional)'"
            :hint="auth.isAdmin ? 'Wajib diisi jika harga, stok, atau satuan diubah' : 'Opsional. Tampil di riwayat perubahan'"
            persistent-hint
            placeholder="Harga dari supplier naik"
            rows="2"
            auto-grow
            :rules="[rules.max(200)]"
          />
        </v-col>
      </v-row>
    </v-col>
  </v-row>
</template>