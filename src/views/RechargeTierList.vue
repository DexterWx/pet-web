<template>
  <div class="page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="小程序充值页只展示这里配置的档位，用户只能点选、不能自输金额。系统必须至少保留一个档位，因此仅剩一条时不可删除。"
      style="margin-bottom: 16px"
    />

    <div class="page-toolbar">
      <span class="text-muted">共 {{ list.length }} 个档位</span>
      <div class="spacer" />
      <el-button :icon="Refresh" @click="load">刷新</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增档位</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="label" label="档位标题" min-width="140" />
      <el-table-column label="充值" width="120">
        <template #default="{ row }">¥{{ fenToYuan(row.thresholdFen) }}</template>
      </el-table-column>
      <el-table-column label="赠送" width="120">
        <template #default="{ row }">
          <span v-if="row.giftFen" class="price">¥{{ fenToYuan(row.giftFen) }}</span>
          <span v-else class="text-muted">不送</span>
        </template>
      </el-table-column>
      <el-table-column label="用户到账" width="130">
        <template #default="{ row }">¥{{ fenToYuan(row.thresholdFen + row.giftFen) }}</template>
      </el-table-column>
      <el-table-column prop="sub" label="角标文案" min-width="120" />
      <el-table-column prop="sort" label="排序" width="90" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-tooltip
            :disabled="list.length > 1"
            content="至少需保留一个档位，请先新增其他档位"
            placement="top"
          >
            <span>
              <el-button link type="danger" :icon="Delete" :disabled="list.length <= 1" @click="remove(row)">
                删除
              </el-button>
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑充值档位' : '新增充值档位'" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="充值金额(元)" prop="thresholdYuan">
          <el-input-number v-model="form.thresholdYuan" :min="0.01" :precision="2" :step="10" controls-position="right" />
        </el-form-item>
        <el-form-item label="赠送金额(元)">
          <el-input-number v-model="form.giftYuan" :min="0" :precision="2" :step="10" controls-position="right" />
          <span class="text-muted" style="margin-left:8px;font-size:12px">填 0 即不赠送</span>
        </el-form-item>
        <el-form-item label="档位标题">
          <el-input v-model="form.label" placeholder="如：充1000元" maxlength="32" />
        </el-form-item>
        <el-form-item label="角标文案">
          <el-input v-model="form.sub" placeholder="如：送100元；留空则不显示" maxlength="32" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :step="1" controls-position="right" />
          <span class="text-muted" style="margin-left:8px;font-size:12px">数字越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
import { rechargeTierApi } from '@/api'
import { fenToYuan, yuanToFen } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const list = ref([])

const dialog = ref(false)
const formRef = ref()
const emptyForm = () => ({ id: null, thresholdYuan: 1000, giftYuan: 100, label: '', sub: '', sort: 0 })
const form = reactive(emptyForm())
const rules = { thresholdYuan: [{ required: true, message: '请输入充值金额', trigger: 'blur' }] }

async function load() {
  loading.value = true
  try {
    list.value = await rechargeTierApi.list()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, emptyForm())
  dialog.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    thresholdYuan: Number((row.thresholdFen / 100).toFixed(2)),
    giftYuan: Number((row.giftFen / 100).toFixed(2)),
    label: row.label,
    sub: row.sub,
    sort: row.sort || 0,
  })
  dialog.value = true
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      thresholdFen: yuanToFen(form.thresholdYuan),
      giftFen: yuanToFen(form.giftYuan),
      label: form.label || `充${form.thresholdYuan}元`,
      sub: form.sub,
      sort: form.sort,
    }
    if (form.id) await rechargeTierApi.update(form.id, payload)
    else await rechargeTierApi.create(payload)
    ElMessage.success('保存成功')
    dialog.value = false
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除档位「${row.label}」？`, '删除确认', {
      type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消',
    })
  } catch (e) {
    return // 用户取消
  }
  try {
    await rechargeTierApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    // 拦截器已提示（如后端挡了最后一个档位）
  }
}

onMounted(load)
onActivated(load)
</script>
