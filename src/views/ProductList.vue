<template>
  <div class="page product-page">
    <!-- 顶部工具条 -->
    <div class="page-toolbar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索商品标题"
        clearable
        style="width: 220px"
        :prefix-icon="Search"
        @keyup.enter="reload"
        @clear="reload"
      />
      <el-select v-model="query.onSale" placeholder="上架状态" clearable style="width: 130px" @change="reload">
        <el-option label="已上架" value="true" />
        <el-option label="已下架" value="false" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="reload">查询</el-button>
      <div class="spacer" />
      <el-button :icon="Download" :loading="exporting" @click="doExport">导出CSV</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建商品</el-button>
    </div>

    <div class="body">
      <!-- 左侧分类栏（镜像小程序分类页结构）-->
      <div class="cat-side">
        <div class="cat-title">商品分类</div>
        <div
          class="cat-item"
          :class="{ active: query.categoryId === '' }"
          @click="selectCategory('')"
        >
          全部
          <span class="cat-count">{{ totalAll }}</span>
        </div>
        <div
          v-for="c in categories"
          :key="c.id"
          class="cat-item"
          :class="{ active: query.categoryId === c.id }"
          @click="selectCategory(c.id)"
        >
          {{ c.name }}
          <span class="cat-count">{{ c.productCount }}</span>
        </div>
        <div v-if="!categories.length" class="cat-empty text-muted">暂无分类，请先到「分类管理」创建</div>
      </div>

      <!-- 右侧商品网格（卡片样式贴近小程序商品呈现）-->
      <div class="goods-main" v-loading="loading">
        <el-empty v-if="!loading && !products.length" description="该分类下暂无商品" />
        <div v-else class="goods-grid">
          <div v-for="p in products" :key="p.id" class="goods-card" :class="{ off: !p.onSale }">
            <div class="gc-img">
              <el-image
                v-if="p.images && p.images.length"
                :src="p.images[0]"
                :preview-src-list="p.images"
                :initial-index="0"
                fit="contain"
                preview-teleported
              />
              <div v-else class="gc-noimg">无图</div>
              <span class="gc-badge" :class="p.onSale ? 'on' : 'offp'">
                {{ p.onSale ? '已上架' : '已下架' }}
              </span>
            </div>
            <div class="gc-info">
              <div class="gc-title" :title="p.title">{{ p.title }}</div>
              <div class="gc-cat text-muted">{{ p.categoryName || '未分类' }}</div>
              <div class="gc-price-row">
                <span class="price">¥{{ fenToYuan(p.priceFen) }}</span>
                <span class="gc-sold text-muted">已售{{ p.sold }}</span>
              </div>
              <div class="gc-actions">
                <el-switch
                  :model-value="p.onSale"
                  inline-prompt
                  active-text="上架"
                  inactive-text="下架"
                  @change="(v) => toggleSale(p, v)"
                />
                <div class="gc-btns">
                  <el-button link type="primary" :icon="Edit" @click="openEdit(p)">编辑</el-button>
                  <el-button link type="danger" :icon="Delete" @click="removeProduct(p)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </div>

    <!-- 新建/编辑抽屉 -->
    <el-drawer v-model="drawer" :title="form.id ? '编辑商品' : '新建商品'" size="520px" @closed="onDrawerClosed">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="商品标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入商品标题" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格(元)" prop="priceYuan">
          <el-input-number v-model="form.priceYuan" :min="0.01" :precision="2" :step="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :step="1" controls-position="right" />
          <span class="text-muted" style="margin-left:8px;font-size:12px">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="上架">
          <el-switch v-model="form.onSale" inline-prompt active-text="上架" inactive-text="下架" />
        </el-form-item>
        <el-form-item label="商品图片">
          <ImageUpload v-model="form.images" :max="8" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.desc" type="textarea" :rows="4" placeholder="请输入商品描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, Download } from '@element-plus/icons-vue'
import { productApi, categoryApi, exportCsv } from '@/api'
import { fenToYuan, yuanToFen } from '@/utils/format'
import ImageUpload from '@/components/ImageUpload.vue'

const loading = ref(false)
const exporting = ref(false)
const saving = ref(false)
const products = ref([])
const categories = ref([])
const total = ref(0)
const totalAll = ref(0)

const query = reactive({ keyword: '', categoryId: '', onSale: '', page: 1, pageSize: 12 })

const drawer = ref(false)
const formRef = ref()
const emptyForm = () => ({
  id: '', title: '', categoryId: '', priceYuan: 1, sort: 0, onSale: true, images: [], desc: '',
})
const form = reactive(emptyForm())
const rules = {
  title: [{ required: true, message: '请输入商品标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  priceYuan: [{ required: true, message: '请输入价格', trigger: 'blur' }],
}

async function loadCategories() {
  categories.value = await categoryApi.list()
  totalAll.value = categories.value.reduce((s, c) => s + (c.productCount || 0), 0)
}

async function loadProducts() {
  loading.value = true
  try {
    const data = await productApi.list({ ...query })
    products.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function reload() {
  query.page = 1
  loadProducts()
}
async function doExport() {
  exporting.value = true
  try {
    await exportCsv('products', `products_${Date.now()}.csv`)
    ElMessage.success('已开始下载')
  } catch (e) {
    // 拦截器已提示
  } finally {
    exporting.value = false
  }
}
function selectCategory(id) {
  query.categoryId = id
  reload()
}
function onPage(p) {
  query.page = p
  loadProducts()
}

function openCreate() {
  Object.assign(form, emptyForm())
  if (query.categoryId) form.categoryId = query.categoryId
  drawer.value = true
}
function openEdit(p) {
  Object.assign(form, {
    id: p.id,
    title: p.title,
    categoryId: p.categoryId,
    priceYuan: Number((p.priceFen / 100).toFixed(2)),
    sort: p.sort || 0,
    onSale: p.onSale,
    images: [...(p.images || [])],
    desc: p.desc || '',
  })
  drawer.value = true
}
function onDrawerClosed() {
  formRef.value?.clearValidate()
}

async function save() {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      title: form.title,
      categoryId: form.categoryId,
      priceFen: yuanToFen(form.priceYuan),
      sort: form.sort,
      onSale: form.onSale,
      images: form.images,
      desc: form.desc,
    }
    if (form.id) await productApi.update(form.id, payload)
    else await productApi.create(payload)
    ElMessage.success('保存成功')
    drawer.value = false
    await Promise.all([loadProducts(), loadCategories()])
  } catch (e) {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

async function toggleSale(p, val) {
  try {
    await productApi.setOnSale(p.id, val)
    p.onSale = val
    ElMessage.success(val ? '已上架' : '已下架')
  } catch (e) {
    // 失败保持原状
  }
}

async function removeProduct(p) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${p.title}」？将同时删除其 OSS 图片，且不可恢复。历史订单不受影响。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
    )
  } catch (e) {
    return // 用户取消
  }
  try {
    await productApi.remove(p.id)
    ElMessage.success('已删除')
    await Promise.all([loadProducts(), loadCategories()])
  } catch (e) {
    // 拦截器已提示
  }
}

onMounted(async () => {
  await loadCategories()
  await loadProducts()
})
// keep-alive 回到本页时刷新（分类页可能新增/删除了分类）
onActivated(() => {
  loadCategories()
  loadProducts()
})
</script>

<style scoped>
.product-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
/* 左侧分类栏 —— 镜像小程序 cat-side */
.cat-side {
  width: 160px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--brand-edge);
  border-radius: var(--brand-radius-card);
  padding: 8px 0;
  overflow-y: auto;
}
.cat-title {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--brand-text-sub);
  font-weight: 600;
}
.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--brand-text);
  border-left: 3px solid transparent;
}
.cat-item:hover {
  background: var(--brand-bg);
}
.cat-item.active {
  background: var(--brand-primary-light);
  color: var(--brand-primary);
  border-left-color: var(--brand-edge);
  font-weight: 600;
}
.cat-count {
  font-size: 12px;
  color: var(--brand-text-sub);
}
.cat-empty {
  padding: 16px;
  font-size: 12px;
  text-align: center;
}
/* 右侧商品网格 */
.goods-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
.goods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.goods-card {
  background: #fff;
  border-radius: var(--brand-radius-card);
  overflow: hidden;
  border: 1px solid var(--brand-edge);
  box-shadow: var(--brand-shadow-card);
  transition: box-shadow 0.2s, transform 0.2s;
}
.goods-card:hover {
  box-shadow: 0 4px 14px rgba(31, 29, 27, 0.14);
  transform: translateY(-2px);
}
.goods-card.off {
  opacity: 0.72;
}
.gc-img {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  background: var(--brand-bg-soft);
}
/* 管理页要“看全”商品图，故用 contain（不裁切）而非小程序列表的 aspectFill；
   图不完整时可点击图片全屏预览（el-image preview-teleported，避开卡片 overflow） */
.gc-img :deep(.el-image) {
  display: block;
  width: 100%;
  height: 100%;
}
.gc-noimg {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-text-sub);
  font-size: 13px;
}
.gc-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #fff;
}
.gc-badge.on {
  background: var(--brand-success);
}
.gc-badge.offp {
  background: var(--brand-text-sub);
}
.gc-info {
  padding: 10px 12px 12px;
}
.gc-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  /* 不预留固定高度：单行标题不会多出 20px 空白，与小程序商品卡一致（两行靠 line-clamp 截断） */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.gc-cat {
  font-size: 12px;
  margin: 4px 0;
}
.gc-price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 6px 0 10px;
}
.gc-price-row .price {
  font-size: 18px;
}
.gc-sold {
  font-size: 12px;
}
.gc-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--brand-border);
  padding-top: 8px;
}
.gc-btns {
  display: flex;
  gap: 2px;
}
.pager {
  margin-top: 16px;
}
</style>
