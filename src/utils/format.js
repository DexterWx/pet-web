// 展示层格式化工具：金额（分->元）、时间（毫秒->字符串）。
// 后端约定：金额一律「分」整数，时间戳一律「毫秒」整数（0 表示未发生）。

// 分 -> 元字符串（保留两位）
export function fenToYuan(fen) {
  const n = Number(fen || 0)
  return (n / 100).toFixed(2)
}

// 元 -> 分整数（四舍五入，避免浮点误差）
export function yuanToFen(yuan) {
  const n = Number(yuan || 0)
  return Math.round(n * 100)
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

// 毫秒时间戳 -> yyyy-MM-dd HH:mm；0/空 返回占位符
export function formatTime(ms, placeholder = '-') {
  if (!ms) return placeholder
  const d = new Date(Number(ms))
  if (Number.isNaN(d.getTime())) return placeholder
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}

// 毫秒时间戳 -> yyyy-MM-dd
export function formatDate(ms, placeholder = '-') {
  if (!ms) return placeholder
  const d = new Date(Number(ms))
  if (Number.isNaN(d.getTime())) return placeholder
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
