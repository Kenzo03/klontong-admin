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