// axios 封装：统一注入 admin token、解包 {code,data,message}、401 跳登录。
import axios from 'axios'
import { ElMessage } from 'element-plus'

const TOKEN_KEY = 'pet_admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// dev 走 vite 代理（/api -> :8000）；生产同源由 Nginx 反代，故 baseURL 用相对路径
const request = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 20000,
})

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 避免 401 时重复弹窗/重复跳转
let redirecting = false
function toLogin() {
  if (redirecting) return
  redirecting = true
  setToken('')
  const redirect = encodeURIComponent(window.location.hash.slice(1) || '/products')
  window.location.hash = `#/login?redirect=${redirect}`
  setTimeout(() => {
    redirecting = false
  }, 800)
}

request.interceptors.response.use(
  (response) => {
    const body = response.data
    // 后端统一 {code,data,message}，HTTP 码与 body.code 一致
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      if (body.code === 401) {
        toLogin()
        return Promise.reject(new Error(body.message || '未登录'))
      }
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(Object.assign(new Error(body.message || '请求失败'), { code: body.code }))
    }
    return body
  },
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.message
    if (status === 401) {
      toLogin()
    } else {
      ElMessage.error(msg || error.message || '网络异常')
    }
    return Promise.reject(error)
  }
)

export default request
