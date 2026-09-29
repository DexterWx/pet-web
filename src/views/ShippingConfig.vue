<template>
  <div class="page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="全站一套运费规则；自提免运费，包邮只看商品金额。填 0 即不收/不启用。"
      style="margin-bottom: 16px"
    />

    <el-card v-loading="loading" shadow="never">
      <el-form ref="formRef" :model="form" label-width="140px" style="max-width: 560px">
        <el-form-item label="基础运费(元)">
          <el-input-number v-model="form.baseYuan" :min="0" :precision="2" :step="1" controls-position="right" />
        </el-form-item>

        <el-form-item label="满多少免运费(元)">
          <el-input-number v-model="form.thresholdYuan" :min="0" :precision="2" :step="10" controls-position="right" />
        </el-form-item>

        <el-form-item label="当前生效规则">
          <div class="preview">{{ previewText }}</div>
        </el-form-item>

        <el-form-item>
          <el-button @click="load">重置</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </el-form-item>
      </el-form>

      <div class="tips text-muted">仅影响之后的新订单，历史订单已快照不受影响。</div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { shippingApi } from '@/api'
import { yuanToFen } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const formRef = ref()
const form = reactive({ baseYuan: 0, thresholdYuan: 0 })

const previewText = computed(() => {
  const base = form.baseYuan
  const threshold = form.thresholdYuan
  if (base <= 0) return '全站包邮（快递与自提均不收运费）'
  if (threshold > 0) return `快递订单收取运费 ¥${base.toFixed(2)}；商品金额满 ¥${threshold.toFixed(2)} 免运费；自提免运费`
  return `快递订单收取运费 ¥${base.toFixed(2)}（未设包邮门槛）；自提免运费`
})

async function load() {
  loading.value = true
  try {
    const data = await shippingApi.get()
    form.baseYuan = Number((data.baseFreightFen / 100).toFixed(2))
    form.thresholdYuan = Number((data.freeThresholdFen / 100).toFixed(2))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const data = await shippingApi.update({
      baseFreightFen: yuanToFen(form.baseYuan),
      freeThresholdFen: yuanToFen(form.thresholdYuan),
    })
    form.baseYuan = Number((data.baseFreightFen / 100).toFixed(2))
    form.thresholdYuan = Number((data.freeThresholdFen / 100).toFixed(2))
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
