/**
 * 认证 API
 */
import { post } from './request'

export interface AdminInfo {
  id: number
  username: string
  name: string
  phone?: string | null
  email?: string | null
  avatar?: string | null
  role: 'super_admin' | 'admin' | 'operator'
  brandId?: number | null
  branchId?: number | null
}

export async function login(username: string, password: string) {
  const res = await post<{ token: string; admin: AdminInfo }>(
    '/auth/admin/login', { username, password })
  if (res.success && res.data?.token) {
    localStorage.setItem('admin_token', res.data.token)
    localStorage.setItem('admin_info', JSON.stringify(res.data.admin))
    return res.data
  }
  throw new Error(res.message || '登录失败')
}

export function logout() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_info')
  window.location.hash = '#/login'
}

export function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

export function getAdminInfo(): AdminInfo | null {
  const info = localStorage.getItem('admin_info')
  if (!info) return null
  try {
    return JSON.parse(info) as AdminInfo
  } catch {
    return null
  }
}

export function isLoggedIn(): boolean {
  return !!getToken()
}
