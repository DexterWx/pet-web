<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="text-muted">停用的不在小程序展示；关联商品后点广告牌直达详情。</span>
      <div class="spacer" />
      <el-button :icon="Refresh" @click="load">刷新</el-button>
      <el-button type="primary" :icon="Plus" @click="openEdit(null)">新建广告牌</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column label="预览" width="140">
        <template #default="{ row }">
          <el-image :src="row.image" style="width:100px;height:100px" fit="cover" :preview-src-list="[row.image]" />
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="140" />
      <el-table-column label="跳转商品" min-width="160">
        <template #default="{ row }">{{ productTitle(row.productId) }}</template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled" @change="(v) => toggle(row, v)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !list.length" description="暂无广告牌" />

    <el-dialog v-model="dialog" :title="form.id ? '编辑广告牌' : '新建广告牌'" width="520px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="图片" required>
          <ImageUpload v-model="images" :max="1" />
          <div class="text-muted" style="font-size:12px">正方形图（如 750×750），非正方形会被裁切。</div>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="64" placeholder="选填，仅后台识别用" />
        </el-form-item>
        <el-form-item label="跳转商品">
          <el-select v-model="form.productId" clearable filterable placeholder="不选则点击不跳转" style="width:100%">
            <el-option v-for="p in products" :key="p.id" :label="p.title" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" controls-position="right" />
          <span class="text-muted" style="margin-left:8px;font-size:12px">小者在前</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { bannerApi, productApi } from '@/api'
import ImageUpload from '@/components/ImageUpload.vue'

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const products = ref([])
const dialog = ref(false)
const images = ref([])
const form = reactive({ id: '', title: '', sort: 0, enabled: true, productId: '' })

function productTitle(id) {
  if (!id) return '—'
  const p = products.value.find((x) => x.id === id)
  return p ? p.title : id
}

async function loadProducts() {
  try {
    const data = await productApi.list({ page: 1, pageSize: 200 })
    products.value = data.list || []
  } catch (e) {
    // 忽略
  }
}

async function load() {
  loading.value = true
  try {
    list.value = await bannerApi.list()
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  if (row) {
    form.id = row.id
    form.title = row.title
    form.sort = row.sort
    form.enabled = row.enabled
    form.productId = row.productId || ''
    images.value = [row.image]
  } else {
    form.id = ''
    form.title = ''
    form.sort = 0
    form.enabled = true
    form.productId = ''
    images.value = []
  }
  dialog.value = true
}

async function submit() {
  if (!images.value.length) {
    ElMessage.error('请上传 banner 图片')
    return
  }
  submitting.value = true
  try {
    const payload = { image: images.value[0], title: form.title, sort: form.sort, enabled: form.enabled, productId: form.productId || '' }
    if (form.id) await bannerApi.update(form.id, payload)
    else await bannerApi.create(payload)
    ElMessage.success('已保存')
    dialog.value = false
    await load()
  } catch (e) {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

async function toggle(row, enabled) {
  await bannerApi.update(row.id, { enabled })
  ElMessage.success(enabled ? '已启用' : '已停用')
  await load()
}

async function remove(row) {
  await ElMessageBox.confirm('删除后图片也会一并清理，不可恢复。确认删除？', '删除广告牌', { type: 'warning' })
  await bannerApi.remove(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(() => {
  load()
  loadProducts()
})
onActivated(load)
</script>
