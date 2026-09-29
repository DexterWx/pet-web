<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="text-muted">共 {{ list.length }} 个分类</span>
      <div class="spacer" />
      <el-button type="primary" :icon="Plus" @click="openCreate">新建分类</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="name" label="分类名称" min-width="160" />
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column prop="productCount" label="商品数" width="100" />
      <el-table-column prop="id" label="ID" width="160" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑分类' : '新建分类'" width="420px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="64" />
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
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { categoryApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const list = ref([])

const dialog = ref(false)
const formRef = ref()
const form = reactive({ id: '', name: '', sort: 0 })
const rules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

async function load() {
  loading.value = true
  try {
    list.value = await categoryApi.list()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { id: '', name: '', sort: list.value.length })
  dialog.value = true
}
function openEdit(row) {
  Object.assign(form, { id: row.id, name: row.name, sort: row.sort })
  dialog.value = true
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { name: form.name, sort: form.sort }
    if (form.id) await categoryApi.update(form.id, payload)
    else await categoryApi.create(payload)
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
  if (row.productCount > 0) {
    ElMessage.warning(`「${row.name}」下仍有 ${row.productCount} 个商品，需先移除商品才能删除`)
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除分类「${row.name}」？`, '删除确认', {
      type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消',
    })
  } catch (e) {
    return // 用户取消
  }
  try {
    await categoryApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(load)
onActivated(load)
</script>
