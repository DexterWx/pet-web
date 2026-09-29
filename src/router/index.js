// 路由：登录页独立布局；其余页面套 AdminLayout。守卫校验登录态与超管权限。
import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/layout/AdminLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘', icon: 'DataLine' },
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('@/views/ProductList.vue'),
        meta: { title: '商品管理', icon: 'Goods' },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/views/CategoryList.vue'),
        meta: { title: '分类管理', icon: 'Menu' },
      },
      {
        path: 'recharge-tiers',
        name: 'recharge-tiers',
        component: () => import('@/views/RechargeTierList.vue'),
        meta: { title: '充值活动', icon: 'Wallet' },
      },
      {
        path: 'shipping',
        name: 'shipping',
        component: () => import('@/views/ShippingConfig.vue'),
        meta: { title: '运费设置', icon: 'Van' },
      },
      {
        path: 'order-config',
        name: 'order-config',
        component: () => import('@/views/OrderConfig.vue'),
        meta: { title: '交易设置', icon: 'Setting' },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/OrderList.vue'),
        meta: { title: '订单管理', icon: 'List' },
      },
      {
        path: 'after-sales',
        name: 'after-sales',
        component: () => import('@/views/AfterSaleList.vue'),
        meta: { title: '售后处理', icon: 'RefreshLeft' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/UserList.vue'),
        meta: { title: '用户查询', icon: 'User' },
      },
      {
        path: 'admins',
        name: 'admins',
        component: () => import('@/views/AdminList.vue'),
        meta: { title: '管理员', icon: 'Avatar', superOnly: true },
      },
      {
        path: 'banners',
        name: 'banners',
        component: () => import('@/views/BannerList.vue'),
        meta: { title: '广告牌', icon: 'Picture' },
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: () => import('@/views/AuditLog.vue'),
        meta: { title: '操作溯源', icon: 'Document', superOnly: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
    meta: { public: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    // 已登录访问登录页，直接回商品管理
    if (to.name === 'login' && auth.isLoggedIn) return { path: '/dashboard' }
    return true
  }
  if (!auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.superOnly && !auth.isSuper) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
