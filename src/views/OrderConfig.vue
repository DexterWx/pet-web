<template>
  <div class="page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="发货后多少天自动确认收货（也是已发货可退款的窗口）；超期或已确认后仅管理员可退。自提与快递一致。"
      style="margin-bottom: 16px"
    />

    <el-card v-loading="loading" shadow="never">
      <el-form :model="form" label-width="180px" style="max-width: 560px">
        <el-form-item label="发货后自动确认收货(天)">
          <el-input-number v-model="form.autoCompleteDays" :min="1" :max="365" :step="1" controls-position="right" />
        </el-form-item>

        <el-form-item label="当前生效规则">
          <div class="preview">{{ previewText }}</div>
        </el-form-item>

        <el-form-item>
          <el-button @click="load">重置</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </el-form-item>
      </el-form>

      <div class="tips text-muted">仅影响之后的判定，历史订单不受影响。</div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { orderConfigApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const form = reactive({ autoCompleteDays: 7 })

const previewText = computed(() => {
  const d = form.autoCompleteDays
  if (!d) return '-'
  return `发货后 ${d} 天自动确认收货；已发货订单在 ${d} 天内可申请退款，超期或已确认后仅管理员可退`
})

async function load() {
  loading.value = true
  try {
    const data = await orderConfigApi.get()
    form.autoCompleteDays = data.autoCompleteDays
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const data = await orderConfigApi.update({ autoCompleteDays: form.autoCompleteDays })
    form.autoCompleteDays = data.autoCompleteDays
    ElMessage.success('已保存')
  } catch (e) {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.preview {
  font-size: 14px;
  color: var(--el-color-primary);
  line-height: 1.6;
}
.tips {
  font-size: 12px;
  line-height: 1.6;
}
</style>
