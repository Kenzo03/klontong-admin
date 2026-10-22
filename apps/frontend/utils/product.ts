import type { HistoryEntry, Product, ProductInput, Uom } from '~/types/api'
import { formatNumber, formatRupiah, toNumber } from './format'

/** PRD 6.5: fixed units with Indonesian labels */
export const UOM_LABEL: Record<Uom, string> = {
  PCS: 'Pcs',
  PACK: 'Pak',
  BOX: 'Dus',
  BOTTLE: 'Botol',
  CAN: 'Kaleng',
  SACHET: 'Sachet',
  STRIP: 'Renceng',
  SACK: 'Karung',
}
export const UOM_ITEMS = (Object.keys(UOM_LABEL) as Uom[]).map((value) => ({ value, title: UOM_LABEL[value] }))

/** Status chip used by the list and the detail header */
export const productStatus = (p: Pick<Product, 'isActive' | 'archivedAt'>) =>
  p.archivedAt
    ? { label: 'Diarsipkan', color: 'warning' }
    : p.isActive
      ? { label: 'Aktif', color: 'primary' }
      : { label: 'Nonaktif', color: 'grey' }

/** What the product form edits. Number fields stay text while typing, so "3,4" (decimal comma) works. */
export type ProductFormValues = {
  sku: string
  name: string
  description: string
  categoryId: number | null
  uom: Uom
  price: string
  stock: string
  weight: string
  width: string
  length: string
  height: string
  image: string | null
  isActive: boolean
  reason: string
}

/** PRD 6.3 defaults: unit PCS, stock 0, active */
export const emptyForm = (): ProductFormValues => ({
  sku: '',
  name: '',
  description: '',
  categoryId: null,
  uom: 'PCS',
  price: '',
  stock: '0',
  weight: '',
  width: '',
  length: '',
  height: '',
  image: null,
  isActive: true,
  reason: '',
})

const decimalText = (n: number) => String(n).replace('.', ',')

export const toForm = (p: Product): ProductFormValues => ({
  sku: p.sku,
  name: p.name,
  description: p.description ?? '',
  categoryId: p.categoryId,
  uom: p.uom,
  price: String(p.price),
  stock: String(p.stock),
  weight: decimalText(p.weight),
  width: decimalText(p.width),
  length: decimalText(p.length),
  height: decimalText(p.height),
  image: p.image,
  isActive: p.isActive,
  reason: '',
})

/** Form text → the JSON numbers and nulls the API expects (run only after the form validated) */
export const toInput = (f: ProductFormValues): ProductInput => ({
  sku: f.sku.trim().toUpperCase(),
  name: f.name.trim(),
  description: f.description.trim() || null,
  categoryId: f.categoryId ?? 0,
  uom: f.uom,
  price: Number(f.price),
  stock: Number(f.stock),
  weight: toNumber(f.weight),
  width: toNumber(f.width),
  length: toNumber(f.length),
  height: toNumber(f.height),
  image: f.image,
  isActive: f.isActive,
})

export const HISTORY_ACTION: Record<HistoryEntry['action'], { label: string; color: string }> = {
  'product.create': { label: 'Dibuat', color: 'primary' },
  'product.update': { label: 'Diubah', color: 'info' },
  'product.archive': { label: 'Diarsipkan', color: 'warning' },
  'product.restore': { label: 'Dipulihkan', color: 'secondary' },
}

const num = (v: unknown) => formatNumber(Number(v))

// PRD 6.2: the business fields compared between before and after (timestamps are never "changes")
const HISTORY_FIELDS: { key: keyof Product; label: string; show: (v: unknown) => string }[] = [
  { key: 'name', label: 'Nama', show: String },
  { key: 'sku', label: 'SKU', show: String },
  { key: 'categoryName', label: 'Kategori', show: String },
  { key: 'uom', label: 'Satuan', show: (v) => UOM_LABEL[v as Uom] },
  { key: 'price', label: 'Harga', show: (v) => formatRupiah(Number(v)) },
  { key: 'stock', label: 'Stok', show: num },
  { key: 'isActive', label: 'Status', show: (v) => (v ? 'Aktif' : 'Nonaktif') },
  { key: 'weight', label: 'Berat (kg)', show: num },
  { key: 'length', label: 'Panjang (cm)', show: num },
  { key: 'width', label: 'Lebar (cm)', show: num },
  { key: 'height', label: 'Tinggi (cm)', show: num },
]

/** Lines like "Harga: Rp112.000 → Rp115.000" for one history entry */
export function historyChanges(e: HistoryEntry): string[] {
  if (e.action === 'product.create') return ['Produk dibuat']
  if (e.action === 'product.archive') return ['Produk diarsipkan']
  if (e.action === 'product.restore') return ['Produk dipulihkan']
  const before: Partial<Product> = e.before ?? {}
  const after: Partial<Product> = e.after ?? {}
  const lines = HISTORY_FIELDS.filter((f) => before[f.key] !== after[f.key]).map(
    (f) => `${f.label}: ${f.show(before[f.key])} → ${f.show(after[f.key])}`,
  )
  if (before.description !== after.description) lines.push('Deskripsi diubah')
  if (before.image !== after.image) lines.push(!after.image ? 'Gambar dihapus' : !before.image ? 'Gambar ditambahkan' : 'Gambar diganti')
  return lines.length ? lines : ['Tanpa perubahan data']
}