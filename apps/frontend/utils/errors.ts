// Backend error codes (PRD 10.1) → the Indonesian text the user sees.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email atau password salah.',
  ACCOUNT_PENDING: 'Akun Anda menunggu persetujuan admin toko. Coba masuk lagi setelah disetujui.',
  ACCOUNT_INACTIVE: 'Akun Anda dinonaktifkan. Hubungi admin toko.',
  ACCOUNT_REJECTED: 'Pendaftaran Anda ditolak admin toko.',
  EMAIL_TAKEN: 'Email ini sudah terdaftar.',
  WRONG_PASSWORD: 'Password saat ini salah.',
  SAME_PASSWORD: 'Password baru harus berbeda dari password saat ini.',
  SESSION_EXPIRED: 'Sesi berakhir, silakan masuk lagi.',
  UNAUTHENTICATED: 'Silakan masuk terlebih dahulu.',
  FORBIDDEN: 'Anda tidak punya akses untuk tindakan ini.',
  SELF_CHANGE: 'Anda tidak bisa mengubah peran atau status akun sendiri.',
  INVALID_STATUS_CHANGE: 'Hanya pendaftaran yang menunggu yang bisa ditolak.',
  VALIDATION_FAILED: 'Periksa kembali isian Anda.',
  PRODUCT_NOT_FOUND: 'Produk tidak ditemukan.',
  SKU_TAKEN: 'SKU sudah dipakai produk lain.',
  ADMIN_ONLY_FIELDS: 'Hanya admin yang dapat mengubah harga, stok, atau satuan.',
  REASON_REQUIRED: 'Isi alasan perubahan, karena harga, stok, atau satuan diubah.',
  UOM_CHANGE_INCOMPLETE: 'Ganti satuan wajib disertai harga dan stok baru.',
  IMAGE_NOT_FOUND: 'Gambar belum terunggah. Pilih gambar lagi.',
  FILE_REQUIRED: 'Pilih file gambar.',
  UNSUPPORTED_IMAGE_TYPE: 'Gambar harus JPG, PNG, atau WebP.',
  PAYLOAD_TOO_LARGE: 'Ukuran gambar maksimal 2 MB.',
  INVALID_REFERENCE: 'Kategori tidak ditemukan.',
}

/** The `code` of an API error body, if there is one. */
export const errorCode = (e: unknown): string | undefined => (e as { data?: { code?: string } } | null)?.data?.code

/** Text for any failed call. Unknown codes and network errors get a generic message. */
export const errorMessage = (e: unknown) => MESSAGES[errorCode(e) ?? ''] ?? 'Terjadi kesalahan. Coba lagi.'