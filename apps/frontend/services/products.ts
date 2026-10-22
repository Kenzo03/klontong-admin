import type { Category, HistoryEntry, Item, Page, Product, ProductInput } from '~/types/api'

export type ProductQuery = {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: number
  status?: 'active' | 'inactive' | 'archived'
  sort?: string
  order?: 'asc' | 'desc'
}

/** Products, categories and image upload (PRD 10.2) */
export function useProductsService() {
  const { $api } = useNuxtApp()
  return {
    list: (query: ProductQuery) => $api<Page<Product>>('/products', { query }),
    get: (id: number) => $api<Item<Product>>(`/products/${id}`),
    history: (id: number) => $api<Item<HistoryEntry[]>>(`/products/${id}/history`),
    create: (body: ProductInput) => $api<Item<Product>>('/products', { method: 'POST', body }),
    update: (id: number, body: Partial<ProductInput> & { reason?: string }) =>
      $api<Item<Product>>(`/products/${id}`, { method: 'PATCH', body }),
    archive: (id: number) => $api(`/products/${id}`, { method: 'DELETE' }),
    restore: (id: number) => $api<Item<Product>>(`/products/${id}/restore`, { method: 'POST' }),
    categories: () => $api<Item<Category[]>>('/categories'),
    /** The one multipart request; the response is JSON with the stored path */
    uploadImage: (file: File) => {
      const body = new FormData()
      body.append('file', file)
      return $api<Item<{ url: string }>>('/uploads/images', { method: 'POST', body })
    },
  }
}