<template>
  <div class="page">
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane v-for="t in ORDER_TABS" :key="t.name" :label="t.name" :name="t.name" />
    </el-tabs>

    <div class="page-toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索订单号 / 收货人 / 电话"
        clearable
        style="width: 260px"
        :prefix-icon="Search"
        @keyup.enter="load"
        @clear="load"
      />
      <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      <div class="spacer" />
      <span class="text-muted">共 {{ list.length }} 单</span>
      <el-button :icon="Download" :loading="exporting" @click="doExport">导出CSV</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column label="订单号" min-width="180">
        <template #default="{ row }">
          <div>{{ row.orderNo }}</div>
          <div class="text-muted" style="font-size:12px">{{ formatTime(row.createdAt) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="收货" min-width="160">
        <template #default="{ row }">
          <div>{{ row.receiverName }} {{ row.receiverPhone }}</div>
          <div class="text-muted" style="font-size:12px">{{ deliveryTypeLabel(row.deliveryType) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="180">
        <template #default="{ row }">
          <div v-for="it in row.items" :key="it.productId" class="item-line">
            {{ it.title }} × {{ it.qty }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="130">
        <template #default="{ row }">
          <div><span class="price">¥{{ fenToYuan(row.totalFen) }}</span></div>
          <div v-if="row.freightFen" class="text-muted" style="font-size:12px">含运费 ¥{{ fenToYuan(row.freightFen) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="orderStatusType(row.status)">{{ orderStatusLabel(row.status) }}</el-tag>
          <el-tag v-if="row.afterSale && row.afterSale.status === 'PENDING'" type="warning" size="small" style="margin-top:4px">
            售后中
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'PAID_UNSHIPPED'" link type="success" @click="openShip(row)">发货</el-button>
          <el-button
            v-if="row.status === 'PAID_UNSHIPPED' || row.status === 'SHIPPED' || row.status === 'COMPLETED'"
            link
            type="danger"
            @click="openRefund(row)"
          >退款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="订单详情" size="560px">
      <div v-if="detail" class="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="orderStatusType(detail.status)">{{ orderStatusLabel(detail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="配送方式">{{ deliveryTypeLabel(detail.deliveryType) }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ detail.receiverName }} {{ detail.receiverPhone }}</el-descriptions-item>
          <el-descriptions-item label="收货地址">{{ detail.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流">{{ detail.carrier }} {{ detail.shipNo || '' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatTime(detail.paidAt) }}</el-descriptions-item>
          <el-descriptions-item label="发货时间">{{ formatTime(detail.shippedAt) }}</el-descriptions-item>
        </el-descriptions>

        <h4>商品明细</h4>
        <el-table :data="detail.items" size="small" border>
          <el-table-column label="商品" min-width="160">
            <template #default="{ row }">
              <div class="item-with-img">
                <img v-if="row.image" :src="row.image" alt="" />
                <span>{{ row.title }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="90">
            <template #default="{ row }">¥{{ fenToYuan(row.priceFen) }}</template>
          </el-table-column>
          <el-table-column prop="qty" label="数量" width="70" />
        </el-table>
        <div class="amount-lines">
          <div class="row">
            <span>商品金额</span>
            <span>¥{{ fenToYuan(detail.goodsTotalFen == null ? detail.totalFen : detail.goodsTotalFen) }}</span>
          </div>
          <div class="row">
            <span>运费</span>
            <span>{{ detail.freightFen ? '¥' + fenToYuan(detail.freightFen) : '免运费' }}</span>
          </div>
          <div class="row grand">
            <span>合计</span>
            <span class="price">¥{{ fenToYuan(detail.totalFen) }}</span>
          </div>
        </div>

        <template v-if="detail.afterSale">
          <h4>售后记录</h4>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="状态">
              <el-tag :type="afterSaleStatusType(detail.afterSale.status)">
                {{ afterSaleStatusLabel(detail.afterSale.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="退款金额">¥{{ fenToYuan(detail.afterSale.refundFen) }}</el-descriptions-item>
            <el-descriptions-item label="原因">{{ detail.afterSale.reason || '-' }}</el-descriptions-item>
            <el-descriptions-item label="处理备注">{{ detail.afterSale.adminNote || '-' }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-drawer>

    <!-- 发货弹窗 -->
    <el-dialog v-model="shipVisible" title="订单发货" width="440px">
      <el-form ref="shipFormRef" :model="shipForm" :rules="shipRules" label-width="90px">
        <el-form-item label="配送方式">
          <span>{{ deliveryTypeLabel(current?.deliveryType) }}</span>
        </el-form-item>
        <template v-if="current?.deliveryType === 'EXPRESS'">
          <el-form-item label="物流公司" prop="carrier">
            <el-input v-model="shipForm.carrier" placeholder="如 顺丰速运" />
          </el-form-item>
          <el-form-item label="物流单号" prop="shipNo">
            <el-input v-model="shipForm.shipNo" placeholder="请输入单号" />
          </el-form-item>
        </template>
        <el-form-item v-else label="取货方式">
          <span class="text-muted">自提订单无需填写单号，确认发货即可（用户凭订单到店取货）。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog v-model="refundVisible" title="发起退款" width="440px">
      <el-form ref="refundFormRef" :model="refundForm" :rules="refundRules" label-width="90px">
        <el-form-item label="订单金额">
          <span class="price">¥{{ fenToYuan(current?.totalFen || 0) }}</span>
        </el-form-item>
        <el-form-item label="退款金额" prop="refundYuan">
          <el-input-number v-model="refundForm.refundYuan" :min="0.01" :max="(current?.totalFen || 0) / 100"
            :precision="2" :step="1" controls-position="right" />
          <el-button link type="primary" style="margin-left:8px" @click="refundForm.refundYuan = (current?.totalFen || 0) / 100">全额</el-button>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="refundForm.note" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitRefund">确认退款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Search } from '@element-plus/icons-vue'
import { orderApi, exportCsv } from '@/api'
import { fenToYuan, yuanToFen, formatTime } from '@/utils/format'
import {
  ORDER_TABS, orderStatusLabel, orderStatusType,
  afterSaleStatusLabel, afterSaleStatusType, deliveryTypeLabel,
} from '@/utils/dict'

const loading = ref(false)
const submitting = ref(false)
const exporting = ref(false)
const list = ref([])
const keyword = ref('')
const activeTab = ref('全部')
const route = useRoute()

const detailVisible = ref(false)
const detail = ref(null)

const current = ref(null)
const shipVisible = ref(false)
const shipFormRef = ref()
const shipForm = reactive({ carrier: '', shipNo: '' })
// 仅快递校验公司+单号；自提无需任何单号
const shipRules = {
  carrier: [{ validator: (r, v, cb) => (current.value?.deliveryType === 'EXPRESS' && !v) ? cb(new Error('请输入物流公司')) : cb(), trigger: 'blur' }],
  shipNo: [{ validator: (r, v, cb) => (current.value?.deliveryType === 'EXPRESS' && !v) ? cb(new Error('请输入物流单号')) : cb(), trigger: 'blur' }],
}

const refundVisible = ref(false)
const refundFormRef = ref()
const refundForm = reactive({ refundYuan: 0, note: '' })
const refundRules = { refundYuan: [{ required: true, message: '请输入退款金额', trigger: 'blur' }] }

function currentTab() {
  return ORDER_TABS.find((t) => t.name === activeTab.value) || ORDER_TABS[0]
}

async function load() {
  loading.value = true
  try {
    const t = currentTab()
    const params = { keyword: keyword.value }
    if (t.status) params.status = t.status
    if (t.afterSale) params.afterSale = 1
    list.value = await orderApi.list(params)
  } finally {
    loading.value = false
  }
}

function onTabChange() {
  load()
}

async function doExport() {
  exporting.value = true
  try {
    await exportCsv('orders', `orders_${Date.now()}.csv`)
    ElMessage.success('已开始下载')
  } catch (e) {
    // 拦截器已提示
  } finally {
    exporting.value = false
  }
}

async function openDetail(row) {
  detail.value = await orderApi.detail(row.id)
  detailVisible.value = true
}

function openShip(row) {
  current.value = row
  shipForm.carrier = ''
  shipForm.shipNo = ''
  shipVisible.value = true
}

async function submitShip() {
  await shipFormRef.value.validate()
  submitting.value = true
  try {
    await orderApi.ship(current.value.id, { carrier: shipForm.carrier, shipNo: shipForm.shipNo })
    ElMessage.success('发货成功')
    shipVisible.value = false
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

function openRefund(row) {
  current.value = row
  refundForm.refundYuan = Number((row.totalFen / 100).toFixed(2))
  refundForm.note = ''
  refundVisible.value = true
}

async function submitRefund() {
  await refundFormRef.value.validate()
  submitting.value = true
  try {
    await orderApi.refund(current.value.id, {
      refundFen: yuanToFen(refundForm.refundYuan),
      note: refundForm.note,
    })
    ElMessage.success('退款已发起')
    refundVisible.value = false
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // 支持从仪表盘/售后页带 keyword / tab 跳转过来
  if (route.query.keyword) keyword.value = String(route.query.keyword)
  if (route.query.tab && ORDER_TABS.some((t) => t.name === route.query.tab)) {
    activeTab.value = String(route.query.tab)
  }
  load()
})
onActivated(() => {
  if (route.query.keyword && route.query.keyword !== keyword.value) {
    keyword.value = String(route.query.keyword)
    load()
  }
})
</script>

<style scoped>
.item-line {
  font-size: 13px;
  line-height: 1.6;
}
.detail h4 {
  margin: 18px 0 8px;
}
.item-with-img {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-with-img img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
}
.amount-lines {
  margin-top: 12px;
  font-size: 14px;
}
.amount-lines .row {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  line-height: 1.9;
}
.amount-lines .grand {
  font-size: 15px;
  border-top: 1px solid var(--brand-border);
  padding-top: 6px;
  margin-top: 4px;
}
.amount-lines .grand .price {
  font-size: 18px;
}
</style>
