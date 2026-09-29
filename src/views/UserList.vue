<template>
  <div class="page">
    <div class="page-toolbar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索手机号 / 昵称"
        clearable
        style="width: 240px"
        :prefix-icon="Search"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
      <div class="spacer" />
      <span class="text-muted">共 {{ total }} 位用户</span>
      <el-button :icon="Download" :loading="exporting" @click="doExport">导出CSV</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column label="用户" min-width="180">
        <template #default="{ row }">
          <div>{{ row.nickname || '微信用户' }}</div>
          <div class="text-muted" style="font-size:12px">{{ row.phone || '未绑定手机' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="余额" width="120">
        <template #default="{ row }"><span class="price">¥{{ fenToYuan(row.balanceFen) }}</span></template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="100" />
      <el-table-column label="注册时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" :width="auth.isSuper ? 180 : 100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button v-if="auth.isSuper" link type="warning" @click="openAdjust(row)">调整余额</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager" v-if="total > 0">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="query.pageSize"
        :current-page="query.page"
        @current-change="onPage"
      />
    </div>

    <el-drawer v-model="detailVisible" title="用户详情" size="560px">
      <div v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="昵称">{{ detail.nickname || '微信用户' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone || '未绑定' }}</el-descriptions-item>
          <el-descriptions-item label="余额"><span class="price">¥{{ fenToYuan(detail.balanceFen) }}</span></el-descriptions-item>
          <el-descriptions-item label="订单数">{{ detail.orderCount }}</el-descriptions-item>
          <el-descriptions-item label="累计消费"><span class="price">¥{{ fenToYuan(detail.spentFen) }}</span></el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <h4>最近订单</h4>
        <el-empty v-if="!detail.recentOrders?.length" description="暂无订单" :image-size="60" />
        <el-table v-else :data="detail.recentOrders" size="small" border>
          <el-table-column prop="orderNo" label="订单号" min-width="150" />
          <el-table-column label="金额" width="90">
            <template #default="{ row }">¥{{ fenToYuan(row.totalFen) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="orderStatusType(row.status)">{{ orderStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <!-- 调整余额（测试用，仅超管） -->
    <el-dialog v-model="adjustVisible" title="调整用户余额" width="460px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="仅测试用，不产生真实资金；不计入充值预收，也不出现在用户充值记录。"
        style="margin-bottom: 14px"
      />
      <div v-if="adjustTarget" class="adjust-user">
        {{ adjustTarget.nickname || '微信用户' }}（{{ adjustTarget.phone || '未绑定手机' }}）<br />
        当前余额：<span class="price">¥{{ fenToYuan(adjustTarget.balanceFen) }}</span>
      </div>
      <el-form ref="adjustFormRef" :model="adjustForm" :rules="adjustRules" label-width="100px">
        <el-form-item label="调整金额(元)" prop="amountYuan">
          <el-input-number
            v-model="adjustForm.amountYuan"
            :precision="2"
            :step="100"
            controls-position="right"
            style="width: 100%"
          />
          <div class="text-muted" style="font-size: 12px">正数加、负数减；调整后余额：{{ previewAfter }}</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="adjustForm.note"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="选填，如：测试余额支付"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjusting" @click="submitAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Search } from '@element-plus/icons-vue'
import { userApi, exportCsv } from '@/api'
import { fenToYuan, formatTime, yuanToFen } from '@/utils/format'
import { orderStatusLabel, orderStatusType } from '@/utils/dict'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const exporting = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ keyword: '', page: 1, pageSize: 20 })

const detailVisible = ref(false)
const detail = ref(null)

// ---------- 调整余额（仅超管） ----------
const adjustVisible = ref(false)
const adjusting = ref(false)
const adjustTarget = ref(null)
const adjustFormRef = ref()
const adjustForm = reactive({ amountYuan: 100, note: '' })
const adjustRules = {
  amountYuan: [
    { required: true, message: '请输入调整金额', trigger: 'blur' },
    {
      validator: (rule, value, callback) =>
        !value || Number(value) === 0 ? callback(new Error('调整金额不能为 0')) : callback(),
      trigger: 'blur',
    },
  ],
}

const previewAfter = computed(() => {
  if (!adjustTarget.value) return '-'
  const after = (adjustTarget.value.balanceFen || 0) + yuanToFen(adjustForm.amountYuan || 0)
  return '¥' + fenToYuan(after)
})

function openAdjust(row) {
  adjustTarget.value = row
  adjustForm.amountYuan = 100
  adjustForm.note = ''
  adjustVisible.value = true
}

async function submitAdjust() {
  await adjustFormRef.value.validate()
  adjusting.value = true
  try {
    await userApi.adjustBalance(adjustTarget.value.id, {
      amountFen: yuanToFen(adjustForm.amountYuan),
      note: adjustForm.note,
    })
    ElMessage.success('余额已调整')
    adjustVisible.value = false
    await load()
  } catch (e) {
    // 拦截器已提示（如扣成负数、非超管 403）
  } finally {
    adjusting.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const data = await userApi.list({ ...query })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}
function reload() {
  query.page = 1
  load()
}
async function doExport() {
  exporting.value = true
  try {
    await exportCsv('users', `users_${Date.now()}.csv`)
    ElMessage.success('已开始下载')
  } catch (e) {
    // 拦截器已提示
  } finally {
    exporting.value = false
  }
}
function onPage(p) {
  query.page = p
  load()
}
async function openDetail(row) {
  detail.value = await userApi.detail(row.id)
  detailVisible.value = true
}

onMounted(load)
onActivated(load)
</script>

<style scoped>
.detail h4,
h4 {
  margin: 18px 0 8px;
}

.adjust-user {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--brand-bg);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.8;
}
</style>
