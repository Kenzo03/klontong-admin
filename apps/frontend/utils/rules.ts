// Vuetify field rules: return true when valid, or the message to show. Limits mirror the backend DTOs.
export const rules = {
  required: (v: string) => !!v?.trim() || 'Wajib diisi',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Format email tidak valid',
  length: (min: number, max: number) => (v: string) => (v.length >= min && v.length <= max) || `Harus ${min}–${max} karakter`,
}