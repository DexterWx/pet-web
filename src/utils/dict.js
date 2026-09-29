// 状态字典：与后端 core/constants.py 状态机一一对齐，供表格标签/筛选下拉复用。

// 订单状态 -> { label, type(Element Plus tag 类型) }
export const ORDER_STATUS = {
  PENDING_PAY: { label: '待付款', type: 'warning' },
  PAID_UNSHIPPED: { label: '待发货', type: 'primary' },
  SHIPPED: { label: '待收货', type: 'success' },
  COMPLETED: { label: '已完成', type: 'success' },
  CLOSED: { label: '已关闭', type: 'info' },
  REFUNDING: { label: '退款中', type: 'danger' },
  REFUNDED: { label: '已退款', type: 'info' },
}

// 售后状态
export const AFTER_SALE_STATUS = {
  PENDING: { label: '待处理', type: 'warning' },
  REJECTED: { label: '已驳回', type: 'info' },
  REFUNDING: { label: '退款中', type: 'danger' },
  REFUNDED: { label: '已退款', type: 'success' },
}

// 售后来源
export const AFTER_SALE_SOURCE = {
  USER: { label: '用户申请', type: '' },
  ADMIN: { label: '管理员发起', type: '' },
}

// 配送方式
export const DELIVERY_TYPE = {
  EXPRESS: { label: '快递' },
  SELF_PICKUP: { label: '自提' },
}

// 订单列表 tab（对齐小程序 5 tab 语义；售后中 = 有 PENDING 售后单的订单）
export const ORDER_TABS = [
  { name: '全部', status: '', afterSale: false },
  { name: '待付款', status: 'PENDING_PAY', afterSale: false },
  { name: '待发货', status: 'PAID_UNSHIPPED', afterSale: false },
  { name: '待收货', status: 'SHIPPED', afterSale: false },
  { name: '已完成', status: 'COMPLETED', afterSale: false },
  { name: '售后中', status: '', afterSale: true },
]

export function orderStatusLabel(status) {
  return (ORDER_STATUS[status] || { label: status || '-' }).label
}
export function orderStatusType(status) {
  return (ORDER_STATUS[status] || { type: 'info' }).type
}
export function afterSaleStatusLabel(status) {
  return (AFTER_SALE_STATUS[status] || { label: status || '-' }).label
}
export function afterSaleStatusType(status) {
  return (AFTER_SALE_STATUS[status] || { type: 'info' }).type
}
export function deliveryTypeLabel(type) {
  return (DELIVERY_TYPE[type] || { label: type || '-' }).label
}
