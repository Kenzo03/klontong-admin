import type { Role } from '~/types/api'

/** "2026-10-01T…" → "1 Okt 2026" */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

/** "2026-10-21T07:05:00Z" → "21 Okt 2026, 14.05" (in the browser's time zone) */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** 115000 → "115.000", 3.4 → "3,4" (Indonesian separators) */
export const formatNumber = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 4 })

/** 11500 → "Rp11.500" */
export const formatRupiah = (n: number) => `Rp${formatNumber(n)}`

/** "3,4" or "3.4" → 3.4: the forms accept the Indonesian decimal comma */
export const toNumber = (text: string) => Number(text.trim().replace(',', '.'))

/** "Sari Wulandari" → "SW" (avatars) */
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')

export const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', STAFF: 'Staf' }