<template>
  <div class="img-upload">
    <div class="thumbs">
      <div v-for="(url, idx) in modelValue" :key="url + idx" class="thumb">
        <img :src="url" alt="" />
        <div class="thumb-mask">
          <el-icon v-if="idx > 0" title="左移" @click="move(idx, -1)"><ArrowLeft /></el-icon>
          <el-icon v-if="idx < modelValue.length - 1" title="右移" @click="move(idx, 1)"><ArrowRight /></el-icon>
          <el-icon title="设为主图" @click="setMain(idx)"><Star /></el-icon>
          <el-icon title="删除" @click="remove(idx)"><Delete /></el-icon>
        </div>
        <el-tag v-if="idx === 0" class="main-tag" size="small" type="success" effect="dark">主图</el-tag>
      </div>

      <el-upload
        v-if="modelValue.length < max"
        class="uploader"
        :action="UPLOAD_URL"
        :headers="headers"
        name="file"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :on-success="onSuccess"
        :on-error="onError"
        accept="image/*"
      >
        <div class="upload-btn" v-loading="uploading">
          <el-icon><Plus /></el-icon>
        </div>
      </el-upload>
    </div>
    <p class="tip text-muted">最多 {{ max }} 张，第一张为主图；支持 jpg/png/webp/gif，单张 ≤2MB。可拖动排序按钮调整顺序。</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, ArrowLeft, ArrowRight, Star } from '@element-plus/icons-vue'
import { UPLOAD_URL } from '@/api'
import { getToken } from '@/api/request'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 8 },
})
const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const headers = computed(() => ({ Authorization: `Bearer ${getToken()}` }))

function beforeUpload(file) {
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片不能超过 2MB')
    return false
  }
  uploading.value = true
  return true
}

function onSuccess(res) {
  uploading.value = false
  // 后端统一 {code,data:{url},message}
  if (res && res.code === 0 && res.data?.url) {
    emit('update:modelValue', [...props.modelValue, res.data.url])
  } else {
    ElMessage.error(res?.message || '上传失败')
  }
}

function onError() {
  uploading.value = false
  ElMessage.error('上传失败，请检查登录态或网络')
}

function remove(idx) {
  const next = [...props.modelValue]
  next.splice(idx, 1)
  emit('update:modelValue', next)
}

function move(idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= props.modelValue.length) return
  const next = [...props.modelValue]
  ;[next[idx], next[target]] = [next[target], next[idx]]
  emit('update:modelValue', next)
}

function setMain(idx) {
  if (idx === 0) return
  const next = [...props.modelValue]
  const [item] = next.splice(idx, 1)
  next.unshift(item)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.thumb,
.upload-btn {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  border: 1px solid var(--brand-border);
  position: relative;
  overflow: hidden;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}
.thumb:hover .thumb-mask {
  opacity: 1;
}
.thumb-mask .el-icon {
  color: #fff;
  cursor: pointer;
  font-size: 16px;
}
.thumb-mask .el-icon:hover {
  color: var(--brand-accent);
}
.main-tag {
  position: absolute;
  left: 0;
  top: 0;
}
.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-style: dashed;
  background: var(--brand-bg);
  color: var(--brand-text-sub);
  font-size: 24px;
}
.upload-btn:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}
.tip {
  font-size: 12px;
  margin: 8px 0 0;
}
</style>
