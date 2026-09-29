<template>
  <div class="page">
    <div class="page-toolbar">
      <el-input v-model="action" placeholder="按动作过滤，如 product.delete" style="width:240px" clearable @clear="reload" @keyup.enter="reload" />
      <div class="spacer" />
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="username" label="操作人" width="120" />
      <el-table-column prop="action" label="动作" width="180" />
      <el-table-column prop="target" label="目标" min-width="160" show-overflow-tooltip />
      <el-table-column prop="detail" label="摘要" min-width="180" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP" width="140" />
    </el-table>

    <div class="pager" v-if="total > 0">
      <el-pagination background layout="total, prev, pager, next" :total="total" :page-size="query.pageSize"
        :current-page="query.page" @current-change="onPage" />
    </div>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { auditApi } from '@/api'
import { formatTime } from '@/utils/format'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const action = ref('')
const query = reactive({ page: 1, pageSize: 20 })

async function load() {
  loading.value = true
  try {
    const data = await auditApi.list({ ...query, action: action.value })
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
function onPage(p) {
  query.page = p
  load()
}

onMounted(load)
onActivated(load)
</script>
