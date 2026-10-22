// Shapes returned by the NestJS API (PRD section 10).
export type Role = 'ADMIN' | 'STAFF'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED'

/** GET /auth/me */
export interface Me {
  id: number
  name: string
  email: string
  role: Role
}

export interface User extends Me {
  status: UserStatus
  createdAt: string
}

export interface Item<T> {
  data: T
}

export interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Page<T> {
  data: T[]
  meta: PageMeta
}

export type Uom = 'PCS' | 'PACK' | 'BOX' | 'BOTTLE' | 'CAN' | 'SACHET' | 'STRIP' | 'SACK'

export interface Category {
  id: number
  name: string
}

/** One product as the API returns it (products.mapper.ts on the backend) */
export interface Product {
  id: number
  sku: string
  name: string
  description: string | null
  categoryId: number
  categoryName: string
  uom: Uom
  price: number
  stock: number
  weight: number
  width: number
  length: number
  height: number
  image: string | null
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  updatedBy: { id: number; name: string }
}

/** Body of POST /products and PATCH /products/:id */
export type ProductInput = Pick<
  Product,
  'sku' | 'name' | 'description' | 'categoryId' | 'uom' | 'price' | 'stock' | 'weight' | 'width' | 'length' | 'height' | 'image' | 'isActive'
>

/** GET /products/:id/history: before/after are full product snapshots */
export interface HistoryEntry {
  id: number
  action: 'product.create' | 'product.update' | 'product.archive' | 'product.restore'
  before: Partial<Product> | null
  after: Partial<Product> | null
  reason: string | null
  createdAt: string
  actor: { id: number; name: string; role: Role }
}