<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">🐾 宠物商城后台</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="crumb">{{ currentTitle }}</div>
        <div class="header-right">
          <el-dropdown @command="onCommand">
            <span class="user">
              <el-icon><Avatar /></el-icon>
              {{ auth.displayName || '管理员' }}
              <el-tag v-if="auth.isSuper" size="small" type="danger" effect="dark" style="margin-left:6px">超管</el-tag>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <keep-alive :max="3">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdVisible" title="修改密码" width="420px">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="submitPassword">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// 侧边栏菜单：从路由表提取（超管专属项按权限过滤）
const menus = computed(() => {
  const root = router.options.routes.find((r) => r.path === '/')
  return (root?.children || [])
    .filter((c) => !c.meta?.superOnly || auth.isSuper)
    .map((c) => ({ path: `/${c.path}`, title: c.meta.title, icon: c.meta.icon }))
})

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '管理后台')

// ---------- 修改密码 ----------
const pwdVisible = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref()
const pwdForm = reactive({ oldPassword: '', newPassword: '' })
const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' },
  ],
}

async function onCommand(cmd) {
  if (cmd === 'password') {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdVisible.value = true
  } else if (cmd === 'logout') {
    await ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
    await auth.logout()
    router.replace('/login')
  }
}

async function submitPassword() {
  await pwdFormRef.value.validate()
  pwdLoading.value = true
  try {
    await authApi.changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    pwdVisible.value = false
    ElMessage.success('密码已修改，请重新登录')
    await auth.logout()
    router.replace('/login')
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    pwdLoading.value = false
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
}
/* 侧栏：熊猫黑底，选中项用奶白胶囊（黑底白斑，熊猫语义的反色） */
.aside {
  background: #1a1816;
  overflow-x: hidden;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fffdf8;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
/* 菜单颜色走 CSS 变量（不再用内联 prop） */
.menu {
  border-right: none;
  background-color: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #cfc9be;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.07);
  --el-menu-active-color: #1f1d1b;
}
.menu :deep(.el-menu-item.is-active) {
  background-color: #fffdf8;
  border-radius: 8px;
  margin: 0 8px;
  padding-left: 8px !important;
  width: calc(100% - 16px);
  font-weight: 600;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--brand-edge);
}
.crumb {
  font-size: 16px;
  font-weight: 600;
}
.header-right .user {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--brand-text);
  outline: none;
}
.main {
  background: var(--brand-bg);
  padding: 0;
  overflow-y: auto;
}
</style>
