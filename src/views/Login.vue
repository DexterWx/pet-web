<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <div class="brand">
        <div class="brand-icon">🐾</div>
        <h2>宠物商城管理后台</h2>
        <p class="text-muted">Pet Store Admin</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="账号" :prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    ElMessage.success('登录成功')
    const redirect = route.query.redirect || '/products'
    router.replace(redirect)
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #141311 0%, #2a2723 55%, #45403a 100%);
}
.login-card {
  width: 380px;
  border-radius: 16px;
}
.brand {
  text-align: center;
  margin-bottom: 20px;
}
.brand-icon {
  font-size: 40px;
}
.brand h2 {
  margin: 8px 0 4px;
  font-size: 20px;
}
.brand p {
  margin: 0;
  font-size: 12px;
  letter-spacing: 2px;
}
.submit {
  width: 100%;
}
</style>
