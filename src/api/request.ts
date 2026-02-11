/**
 * Admin Web - HTTP 请求客户端
 * 统一请求/响应处理，自动 Token 注入
 */

const BASE = '/api'

/** 统一后端响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  errors?: string[]
}

/** 分页参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/** 带搜索的分页参数 */
export interface SearchParams extends PaginationParams {
  keyword?: string
}

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('admin_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(BASE + url, { ...options, headers })
    const body = await res.json().catch(() => ({}))

    if (res.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      window.location.href = '/login'
      return { success: false, message: '登录已过期', data: null as T }
    }

    return body as ApiResponse<T>
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '网络错误'
    return { success: false, message: msg, data: null as T }
  }
}

/** 构建查询字符串 */
function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return ''
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => [k, String(v)])
  if (!filtered.length) return ''
  return '?' + new URLSearchParams(filtered).toString()
}

export const get = <T>(url: string, params?: Record<string, string | number | boolean | undefined>) =>
  request<T>(url + buildQuery(params))

export const post = <T>(url: string, data?: unknown) =>
  request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined })

export const put = <T>(url: string, data?: unknown) =>
  request<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined })

export const patch = <T>(url: string, data?: unknown) =>
  request<T>(url, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined })

export const del = <T>(url: string) =>
  request<T>(url, { method: 'DELETE' })
