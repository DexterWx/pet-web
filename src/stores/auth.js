// 登录态：token + 当前管理员信息（含 isSuper），供路由守卫与菜单权限使用。
import { defineStore } from 'pinia'
import { authApi } from '@/api'
import { getToken, setToken } from '@/api/request'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    admin: JSON.parse(localStorage.getItem('pet_admin_info') || 'null'),
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isSuper: (state) => !!(state.admin && state.admin.isSuper),
    displayName: (state) => (state.admin && (state.admin.displayName || state.admin.username)) || '',
  },
  actions: {
    _persist() {
      setToken(this.token)
      if (this.admin) localStorage.setItem('pet_admin_info', JSON.stringify(this.admin))
      else localStorage.removeItem('pet_admin_info')
    },
    async login(payload) {
      const data = await authApi.login(payload)
      this.token = data.token
      this.admin = data.admin
      this._persist()
      return data
    },
    async fetchMe() {
      const admin = await authApi.me()
      this.admin = admin
      this._persist()
      return admin
    },
    async logout() {
      try {
        await authApi.logout()
      } catch (e) {
        // 忽略登出接口异常，本地一律清理
      }
      this.token = ''
      this.admin = null
      this._persist()
    },
  },
})
