import { defineStore } from 'pinia'

const AUTH_STORAGE_KEY = 'auth_user'
const TOKEN_STORAGE_KEY = 'auth_token'
const AUTH_API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4010/api/auth`
  : 'http://localhost:4010/api/auth'

function readUserFromStorage() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_error) {
    return null
  }
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return {
    message: text ? 'Backend auth đang lỗi hoặc chưa chạy đúng cổng 4010.' : 'Không nhận được phản hồi hợp lệ từ backend auth.',
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: readUserFromStorage(),
    token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.user),
    isAdmin: (state) => String(state.user?.role || '').toLowerCase() === 'admin',
    displayName: (state) => state.user?.fullName || state.user?.username || 'Tài khoản',
  },
  actions: {
    persistAuth(user, token = null) {
      this.user = user || null
      this.token = token || null
      if (typeof window === 'undefined') return

      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }

      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }
    },

    async register(payload) {
      this.loading = true
      try {
        let response
        try {
          response = await fetch(`${AUTH_API_BASE}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })
        } catch (_error) {
          throw new Error('Không kết nối được backend đăng nhập/đăng ký ở cổng 4010. Hãy chạy backend rồi thử lại.')
        }
        const data = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(data?.message || 'Đăng ký thất bại.')
        }
        return data.user
      } finally {
        this.loading = false
      }
    },

    async login(payload) {
      this.loading = true
      try {
        let response
        try {
          response = await fetch(`${AUTH_API_BASE}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })
        } catch (_error) {
          throw new Error('Không kết nối được backend admin ở cổng 4010. Hãy chạy backend rồi thử lại.')
        }
        const data = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(data?.message || 'Đăng nhập thất bại.')
        }
        this.persistAuth(data.user, data.token)
        return data.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.loading = true
      try {
        await fetch(`${AUTH_API_BASE}/logout`, { method: 'POST' }).catch(() => null)
      } finally {
        this.persistAuth(null, null)
        this.loading = false
      }
    },
  },
})
