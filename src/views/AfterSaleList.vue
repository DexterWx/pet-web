<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="text-muted">仅展示待处理（PENDING）的售后申请，共 {{ list.length }} 条</span>
      <div class="spacer" />
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="售后单号" min-width="180" />
      <el-table-column prop="orderId" label="订单ID" min-width="180" />
      <el-table-column label="来源" width="120">
        <template #default="{ row }">
          <el-tag size="small">{{ sourceLabel(row.source) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="退款金额" width="120">
        <template #default="{ row }"><span class="price">¥{{ fenToYuan(row.refundFen) }}</span></template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewOrder(row)">查看订单</el-button>
          <el-button link type="success" @click="openHandle(row, 'approve')">同意</el-button>
          <el-button link type="danger" @click="openHandle(row, 'reject')">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !list.length" description="暂无待处理售后" />

    <!-- 退款中（REFUNDING）：等渠道回调；可手动同步查单补偿 -->
    <div class="refunding-block" v-if="refunding.length">
      <div class="page-toolbar">
        <span class="text-muted">退款中（等待渠道到账）：{{ refunding.length }} 条；若渠道已退但状态未更新，点「同步」主动查单收尾。</span>
      </div>
      <el-table :data="refunding" border stripe>
        <el-table-column prop="id" label="售后单号" min-width="180" />
        <el-table-column prop="orderId" label="订单ID" min-width="180" />
        <el-table-column label="退款金额" width="120">
          <template #default="{ row }"><span class="price">¥{{ fenToYuan(row.refundFen) }}</span></template>
        </el-table-column>
        <el-table-column label="渠道退款单号" min-width="160">
          <template #default="{ row }">{{ row.wxRefundId || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewOrder(row)">查看订单</el-button>
            <el-button link type="warning" :loading="syncingId === row.id" @click="syncRefund(row)">同步</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 处理弹窗 -->
    <el-dialog v-model="dialog" :title="action === 'approve' ? '同意退款' : '驳回退款'" width="440px">
      <el-alert
        v-if="action === 'approve'"
        type="warning"
        :closable="false"
        show-icon
        title="同意后将发起退款；全额退款会使订单转为已退款并回退销量。"
        style="margin-bottom:12px"
      />
      <el-form label-width="70px">
        <el-form-item label="退款额">
          <span class="price">¥{{ fenToYuan(current?.refundFen || 0) }}</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="note" type="textarea" :rows="3" :placeholder="action === 'approve' ? '选填' : '请填写驳回理由'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button :type="action === 'approve' ? 'success' : 'danger'" :loading="submitting" @click="submit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { afterSaleApi } from '@/api'
import { fenToYuan, formatTime } from '@/utils/format'
import { AFTER_SALE_SOURCE } from '@/utils/dict'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const syncingId = ref('')
const list = ref([])
const refunding = ref([])

const dialog = ref(false)
const action = ref('approve')
const current = ref(null)
const note = ref('')

function sourceLabel(s) {
  return (AFTER_SALE_SOURCE[s] || { label: s }).label
}

async function load() {
  loading.value = true
  try {
    const [pending, ing] = await Promise.all([
      afterSaleApi.list({ status: 'PENDING' }),
      afterSaleApi.list({ status: 'REFUNDING' }),
    ])
    list.value = pending
    refunding.value = ing
  } finally {
    loading.value = false
  }
}

async function syncRefund(row) {
  syncingId.value = row.id
  try {
    await afterSaleApi.sync(row.id)
    ElMessage.success('已同步退款状态')
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    syncingId.value = ''
  }
}

function viewOrder(row) {
  router.push({ path: '/orders', query: { keyword: row.orderId } })
}

function openHandle(row, act) {
  current.value = row
  action.value = act
  note.value = ''
  dialog.value = true
}

async function submit() {
  submitting.value = true
  try {
    if (action.value === 'approve') await afterSaleApi.approve(current.value.id, { note: note.value })
    else await afterSaleApi.reject(current.value.id, { note: note.value })
    ElMessage.success(action.value === 'approve' ? '已同意退款' : '已驳回')
    dialog.value = false
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

onMounted(load)
onActivated(load)
</script>
