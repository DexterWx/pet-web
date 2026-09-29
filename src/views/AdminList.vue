<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="text-muted">共 {{ list.length }} 个管理员账号</span>
      <div class="spacer" />
      <el-button type="primary" :icon="Plus" @click="openCreate">新建管理员</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="username" label="账号" min-width="140" />
      <el-table-column prop="displayName" label="姓名" min-width="140" />
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.isSuper" type="danger" effect="dark" size="small">超级管理员</el-tag>
          <el-tag v-else type="info" size="small">普通管理员</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近登录" width="160">
        <template #default="{ row }">{{ formatTime(row.lastLoginAt, '从未登录') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.isActive ? 'warning' : 'success'" @click="toggleActive(row)">
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button link type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑管理员' : '新建管理员'" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" :disabled="!!form.id" placeholder="登录账号" maxlength="64" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.displayName" placeholder="展示名（选填）" maxlength="64" />
        </el-form-item>
        <el-form-item label="密码" :prop="form.id ? '' : 'password'">
          <el-input v-model="form.password" type="password" show-password
            :placeholder="form.id ? '留空则不修改密码' : '至少 6 位'" />
        </el-form-item>
        <el-form-item label="超级管理员">
          <el-switch v-model="form.isSuper" />
          <span class="text-muted" style="margin-left:8px;font-size:12px">超管可管理其他账号</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.isActive" />
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { adminApi } from '@/api'
import { formatTime } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const list = ref([])

const dialog = ref(false)
const formRef = ref()
const emptyForm = () => ({ id: '', username: '', displayName: '', password: '', isSuper: false, isActive: true })
const form = reactive(emptyForm())
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

async function load() {
  loading.value = true
  try {
    list.value = await adminApi.list()
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
    id: row.id, username: row.username, displayName: row.displayName,
    password: '', isSuper: row.isSuper, isActive: row.isActive,
  })
  dialog.value = true
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (form.id) {
      const payload = { displayName: form.displayName, isSuper: form.isSuper, isActive: form.isActive }
      if (form.password) payload.password = form.password
      await adminApi.update(form.id, payload)
    } else {
      await adminApi.create({
        username: form.username, displayName: form.displayName,
        password: form.password, isSuper: form.isSuper, isActive: form.isActive,
      })
    }
    ElMessage.success('保存成功')
    dialog.value = false
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

async function toggleActive(row) {
  const next = !row.isActive
  try {
    await ElMessageBox.confirm(`确定${next ? '启用' : '禁用'}「${row.username}」？`, '提示', { type: 'warning' })
  } catch (e) {
    return // 用户取消
  }
  try {
    await adminApi.update(row.id, { isActive: next })
    ElMessage.success('已更新')
    await load()
  } catch (e) {
    // 拦截器已提示（如不能禁用自己）
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除管理员「${row.username}」？其登录态将立即失效。`, '删除确认', {
      type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消',
    })
  } catch (e) {
    return // 用户取消
  }
  try {
    await adminApi.remove(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(load)
</script>
