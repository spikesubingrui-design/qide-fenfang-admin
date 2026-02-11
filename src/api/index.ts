/**
 * Admin Web - API 模块汇总
 * 按业务领域组织，全部带类型
 */
import { get, post, put, del, type ApiResponse, type SearchParams } from './request'

// ==================== 类型定义 ====================

/** 客户 */
export interface Customer {
  id: number
  phone: string
  name: string
  avatar?: string | null
  gender?: string | null
  level: string
  points: number
  totalSpent: number
  rfmTag?: string | null
  tags?: string | null
  branchId?: number | null
  status: string
  createdAt: string
}

/** 员工 */
export interface Staff {
  id: number
  name: string
  phone: string
  avatar?: string | null
  role: string
  level?: string | null
  branchId?: number | null
  commissionRate: number
  status: string
  createdAt: string
}

/** 订单 */
export interface Order {
  id: number
  orderNo: string
  customerId: number
  type: string
  totalAmount: number
  paidAmount: number
  discountAmount: number
  paymentStatus: string
  status: string
  createdAt: string
  customer?: { id: number; name: string; phone: string }
  branch?: { id: number; name: string } | null
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

/** 预约 */
export interface Reservation {
  id: number
  customerId: number
  staffId?: number | null
  serviceName: string
  date: string
  startTime: string
  endTime?: string | null
  status: string
  customer?: { id: number; name: string; phone: string }
  staff?: { id: number; name: string } | null
}

/** 服务项目 */
export interface Service {
  id: number
  name: string
  categoryId: number
  price: number
  duration: number
  status: string
}

/** 门店 */
export interface Branch {
  id: number
  name: string
  address?: string | null
  phone?: string | null
  manager?: string | null
  status: string
}

/** 库存 */
export interface InventoryItem {
  id: number
  name: string
  category: string
  unit: string
  price: number
  minStock: number
  status: string
}

// ==================== API 模块 ====================

/** 客户管理 */
export const customerApi = {
  getList: (params?: SearchParams & { status?: string; level?: string; branchId?: number }) =>
    get<Customer[]>('/customers', params),
  getDetail: (id: number) => get<Customer>(`/customers/${id}`),
  create: (data: { phone: string; name: string; gender?: string; branchId?: number }) =>
    post<Customer>('/customers', data),
  update: (id: number, data: Partial<Customer>) =>
    put<Customer>(`/customers/${id}`, data),
  delete: (id: number) => del(`/customers/${id}`)
}

/** 员工管理 */
export const staffApi = {
  getList: (params?: SearchParams & { role?: string; branchId?: number }) =>
    get<Staff[]>('/staff', params),
  getDetail: (id: number) => get<Staff>(`/staff/${id}`),
  create: (data: { name: string; phone: string; role: string; branchId?: number }) =>
    post<Staff>('/staff', data),
  update: (id: number, data: Partial<Staff>) =>
    put<Staff>(`/staff/${id}`, data),
  delete: (id: number) => del(`/staff/${id}`)
}

/** 订单管理 */
export const orderApi = {
  getList: (params?: SearchParams & { type?: string; paymentStatus?: string; status?: string; branchId?: number; startDate?: string; endDate?: string }) =>
    get<Order[]>('/orders', params),
  getDetail: (id: number) => get<Order>(`/orders/${id}`),
  create: (data: { customerId: number; type: string; totalAmount: number; items?: Omit<OrderItem, 'id'>[] }) =>
    post<Order>('/orders', data),
  pay: (id: number, data: { paidAmount: number; paymentMethod?: string }) =>
    post<Order>(`/orders/${id}/pay`, data),
  cancel: (id: number) => post<Order>(`/orders/${id}/cancel`)
}

/** 预约管理 */
export const reservationApi = {
  getList: (params?: SearchParams & { status?: string; date?: string; staffId?: number }) =>
    get<Reservation[]>('/reservations', params),
  getDetail: (id: number) => get<Reservation>(`/reservations/${id}`),
  create: (data: { customerId: number; serviceName: string; staffId?: number; date: string; startTime: string }) =>
    post<Reservation>('/reservations', data),
  confirm: (id: number) => post<Reservation>(`/reservations/${id}/confirm`),
  cancel: (id: number, reason?: string) =>
    post<Reservation>(`/reservations/${id}/cancel`, { reason })
}

/** 服务管理 */
export const serviceApi = {
  getCategories: () => get<{ id: number; name: string; sort: number }[]>('/services/categories'),
  getList: (params?: SearchParams & { categoryId?: number }) =>
    get<Service[]>('/services', params),
  getDetail: (id: number) => get<Service>(`/services/${id}`),
  create: (data: Partial<Service>) => post<Service>('/services', data),
  update: (id: number, data: Partial<Service>) => put<Service>(`/services/${id}`, data)
}

/** 门店管理 */
export const branchApi = {
  getAll: () => get<Branch[]>('/branches/all'),
  getDetail: (id: number) => get<Branch>(`/branches/${id}`),
  create: (data: Partial<Branch>) => post<Branch>('/branches', data),
  update: (id: number, data: Partial<Branch>) => put<Branch>(`/branches/${id}`, data)
}

/** 库存管理 */
export const inventoryApi = {
  getItems: (params?: SearchParams & { category?: string }) =>
    get<InventoryItem[]>('/inventory/items', params),
  getStock: (branchId: number) =>
    get<{ itemId: number; itemName: string; quantity: number; minStock: number }[]>(
      `/inventory/stock/${branchId}`),
  adjustStock: (branchId: number, itemId: number, data: { type: 'in' | 'out' | 'adjust'; quantity: number; reason?: string }) =>
    post(`/inventory/adjust`, { branchId, itemId, ...data })
}

/** 统计 */
export const statsApi = {
  getDashboard: () => get<{
    todayOrders: number
    todayRevenue: number
    totalCustomers: number
    totalStaff: number
    monthlyRevenue: number
    reservationCount: number
  }>('/stats/dashboard'),

  getRevenueTrend: (params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' }) =>
    get<{ date: string; amount: number }[]>('/stats/revenue-trend', params)
}

// 重导出
export type { ApiResponse, SearchParams }
export { login, logout, getToken, isLoggedIn, getAdminInfo } from './auth'
export type { AdminInfo } from './auth'
