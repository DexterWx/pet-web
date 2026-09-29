// 后端 admin 接口封装：与 /api/v1/admin 契约一一对应。
import request from './request'

// ---------- 认证 ----------
export const authApi = {
  login: (data) => request.post('/auth/login', data),
  logout: () => request.post('/auth/logout'),
  me: () => request.get('/auth/me'),
  changePassword: (data) => request.post('/auth/change-password', data),
}

// ---------- 商品 ----------
export const productApi = {
  list: (params) => request.get('/products', { params }),
  detail: (id) => request.get(`/products/${id}`),
  create: (data) => request.post('/products', data),
  update: (id, data) => request.put(`/products/${id}`, data),
  setOnSale: (id, onSale) => request.patch(`/products/${id}/on-sale`, { onSale }),
  remove: (id) => request.delete(`/products/${id}`),
}

// ---------- 分类 ----------
export const categoryApi = {
  list: () => request.get('/categories'),
  create: (data) => request.post('/categories', data),
  update: (id, data) => request.put(`/categories/${id}`, data),
  remove: (id) => request.delete(`/categories/${id}`),
}

// ---------- 订单 ----------
export const orderApi = {
  list: (params) => request.get('/orders', { params }),
  detail: (id) => request.get(`/orders/${id}`),
  ship: (id, data) => request.post(`/orders/${id}/ship`, data),
  refund: (id, data) => request.post(`/orders/${id}/refund`, data),
}

// ---------- 售后 ----------
export const afterSaleApi = {
  list: (params) => request.get('/after-sales', { params }),
  approve: (id, data) => request.post(`/after-sales/${id}/approve`, data),
  reject: (id, data) => request.post(`/after-sales/${id}/reject`, data),
  // 主动查渠道退款单状态（掉单补偿）：REFUNDING 且渠道已 SUCCESS 则收尾为 REFUNDED
  sync: (id) => request.post(`/after-sales/${id}/sync`),
}

// ---------- 用户 ----------
export const userApi = {
  list: (params) => request.get('/users', { params }),
  detail: (id) => request.get(`/users/${id}`),
  // 手动调整余额（测试用，仅超管）；amountFen 可负表示扣减
  adjustBalance: (id, data) => request.post(`/users/${id}/balance-adjust`, data),
}

// ---------- 管理员账号 ----------
export const adminApi = {
  list: () => request.get('/admins'),
  create: (data) => request.post('/admins', data),
  update: (id, data) => request.put(`/admins/${id}`, data),
  remove: (id) => request.delete(`/admins/${id}`),
}

// ---------- 充值档位（运营活动） ----------
export const rechargeTierApi = {
  list: () => request.get('/recharge-tiers'),
  create: (data) => request.post('/recharge-tiers', data),
  update: (id, data) => request.put(`/recharge-tiers/${id}`, data),
  remove: (id) => request.delete(`/recharge-tiers/${id}`),
}

// ---------- 运费设置（全局一套） ----------
export const shippingApi = {
  get: () => request.get('/shipping-config'),
  update: (data) => request.put('/shipping-config', data),
}

// ---------- 交易设置（发货后自动确认/退款窗口天数） ----------
export const orderConfigApi = {
  get: () => request.get('/order-config'),
  update: (data) => request.put('/order-config', data),
}

// ---------- 图片上传 ----------
// 返回上传接口完整 URL（供 el-upload action 使用）
export const UPLOAD_URL = '/api/v1/admin/upload/image'

// ---------- Banner ----------
export const bannerApi = {
  list: () => request.get('/banners'),
  create: (data) => request.post('/banners', data),
  update: (id, data) => request.put(`/banners/${id}`, data),
  remove: (id) => request.delete(`/banners/${id}`),
}

// ---------- 仪表盘 ----------
export const dashboardApi = {
  get: (params) => request.get('/dashboard', { params }),
}

// ---------- 操作溯源（仅超管） ----------
export const auditApi = {
  list: (params) => request.get('/audit-logs', { params }),
}

// ---------- CSV 导出（blob 下载） ----------
export async function exportCsv(kind, filename) {
  const blob = await request.get(`/export/${kind}`, { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
