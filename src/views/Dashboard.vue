<template>
  <div class="page" v-loading="loading">
    <div class="page-toolbar">
      <el-radio-group v-model="period" @change="onPeriodChange">
        <el-radio-button label="today">今日</el-radio-button>
        <el-radio-button label="month">本月</el-radio-button>
        <el-radio-button label="custom">自定义</el-radio-button>
      </el-radio-group>
      <el-date-picker
        v-if="period === 'custom'"
        v-model="range"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="~"
        start-placeholder="开始"
        end-placeholder="结束"
        style="margin-left:12px;width:240px"
        @change="load"
      />
      <div class="spacer" />
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>

    <!-- 周期指标（el-row 的 gutter 只管横向，换行需自行补纵向间距） -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="num">{{ m.orderCount }}</div><div class="lbl">{{ prefix }}订单数</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="num price">¥{{ yuan(m.salesFen) }}</div><div class="lbl">{{ prefix }}销售额</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="num price">¥{{ yuan(m.avgOrderFen) }}</div><div class="lbl">客单价</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="num">{{ m.buyerCount }}</div><div class="lbl">{{ prefix }}成交买家</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="num">{{ m.newCustomerCount }}</div><div class="lbl">{{ prefix }}新客</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="num danger">¥{{ yuan(m.refundFen) }}</div><div class="lbl">{{ prefix }}退款</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never" class="clickable" @click="goTab('orders','待发货')"><div class="stat"><div class="num">{{ p.pendingShipCount }}</div><div class="lbl">待发货</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never" class="clickable" @click="goTab('after-sales')"><div class="stat"><div class="num">{{ p.pendingAfterSaleCount }}</div><div class="lbl">待处理售后</div></div></el-card></el-col>
    </el-row>

    <!-- 趋势（仅本月/自定义） -->
    <el-card v-if="data.trend" shadow="never" style="margin-top:16px">
      <template #header><span>每日销售趋势</span></template>
      <div v-if="!trendMax" class="text-muted">该区间暂无成交订单。</div>
      <div v-else class="trend">
        <div class="trend-col" v-for="t in data.trend" :key="t.date">
          <div class="trend-bar-wrap"><div class="trend-bar" :style="{ height: barH(t.salesFen) }" :title="`¥${yuan(t.salesFen)} / ${t.orderCount}单`"></div></div>
          <div class="trend-day">{{ t.date.slice(5) }}</div>
        </div>
      </div>
    </el-card>

    <!-- 累计（不随周期/退款/注销变） -->
    <el-row :gutter="16" class="stat-row" style="margin-top:16px">
      <el-col :span="8"><el-card shadow="never"><div class="stat"><div class="num">{{ f.userCount }}</div><div class="lbl">总用户数</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="never"><div class="stat"><div class="num price">¥{{ yuan(f.totalFlowFen) }}</div><div class="lbl">总流水</div></div></el-card></el-col>
      <el-col :span="8"><el-card shadow="never"><div class="stat"><div class="num">{{ f.totalOrderCount }}</div><div class="lbl">总订单数</div></div></el-card></el-col>
    </el-row>
    <div class="footnote">总流水/总订单数含已退款、不扣减；总用户数为累计注册。</div>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { dashboardApi } from '@/api'

const router = useRouter()
const loading = ref(false)
const period = ref('today')
const range = ref([])
const data = ref({ metrics: {}, pending: {}, fundamentals: {} })

const m = computed(() => data.value.metrics || {})
const p = computed(() => data.value.pending || {})
const f = computed(() => data.value.fundamentals || {})
const prefix = computed(() => ({ today: '今日', month: '本月', custom: '区间' }[period.value] || ''))
const trendMax = computed(() => Math.max(0, ...(data.value.trend || []).map((t) => t.salesFen)))

function yuan(fen) { return ((fen || 0) / 100).toFixed(2) }
function barH(fen) {
  const max = trendMax.value || 1
  return Math.max(fen > 0 ? 6 : 0, Math.round((fen / max) * 120)) + 'px'
}
function goTab(name, status) {
  router.push(status ? { path: '/' + name, query: { tab: status } } : { path: '/' + name })
}
function onPeriodChange() { if (period.value !== 'custom') load() }

async function load() {
  if (period.value === 'custom' && (!range.value || range.value.length !== 2)) return
  loading.value = true
  try {
    const params = { period: period.value }
    if (period.value === 'custom') { params.start = range.value[0]; params.end = range.value[1] }
    data.value = await dashboardApi.get(params)
  } finally {
    loading.value = false
  }
}

onMounted(load)
onActivated(load)
</script>

<style scoped>
.stat { text-align: center; padding: 8px 0; }
.stat .num { font-size: 26px; font-weight: 700; }
.stat .num.price { color: var(--el-color-primary); }
.stat .num.danger { color: var(--el-color-danger); }
.stat .lbl { margin-top: 6px; font-size: 14px; color: var(--brand-text); }
.clickable { cursor: pointer; }
/* el-row 的 :gutter 只产生横向间距，8 个 span=6 换行后行与行会贴在一起；
   卡片加了黑边后尤其明显，这里补上纵向间距。 */
.stat-row { row-gap: 16px; }
.footnote { margin-top: 10px; font-size: 12px; color: var(--brand-text-sub); }
.trend { display: flex; align-items: flex-end; gap: 8px; overflow-x: auto; padding: 8px 0 4px; }
.trend-col { display: flex; flex-direction: column; align-items: center; min-width: 34px; }
.trend-bar-wrap { height: 120px; display: flex; align-items: flex-end; }
.trend-bar { width: 22px; background: var(--el-color-primary); border-radius: 4px 4px 0 0; }
.trend-day { margin-top: 6px; font-size: 11px; color: var(--brand-text-sub); }
</style>
