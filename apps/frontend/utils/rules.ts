import { formatNumber, toNumber } from './format'

// Vuetify field rules: return true when valid, or the message to show. Limits mirror the backend DTOs.
export const rules = {
  required: (v: unknown) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Wajib diisi',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Format email tidak valid',
  length: (min: number, max: number) => (v: string) => (v.length >= min && v.length <= max) || `Harus ${min}–${max} karakter`,
  max: (n: number) => (v: string | null) => (v ?? '').length <= n || `Maksimal ${n} karakter`,
  sku: (v: string) => /^[A-Z0-9-]{3,50}$/.test(v.trim()) || '3–50 huruf besar, angka, atau tanda hubung',
  int: (min: number, max: number) => (v: string) => {
    const digits = v.trim().replace(/\./g, '')
    return (/^\d+$/.test(digits) && Number(digits) >= min && Number(digits) <= max) || `Bilangan bulat ${formatNumber(min)}–${formatNumber(max)}`
  },
  decimal: (min: number, max: number, places: number) => (v: string) =>
    (new RegExp(`^\\d+([.,]\\d{1,${places}})?$`).test(v.trim()) && toNumber(v) >= min && toNumber(v) <= max) ||
    `Angka ${formatNumber(min)}–${formatNumber(max)}`,
}