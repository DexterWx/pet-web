# pet-web 管理后台规格与交接（Phase F）

> 技术栈：**Vue 3 + Vite + Element Plus + Pinia + vue-router + axios**。
> **状态：全部完成**。第一批（登录/商品/分类/订单/售后/用户/管理员多账号）+ 第二批（仪表盘、广告牌管理、充值活动、运费设置、交易设置、CSV 导出、操作溯源）均已实现并跑通。上线部署见仓库根 `../DEPLOY.md`。
> 先读仓库根 `../HANDOFF.md`（全局状态/运行/坑），再读 `../pet-back/docs/architecture.md`（后端分层与契约）。

## 0. 目录结构（已建）

```
pet-web/
  package.json / vite.config.js / index.html
  src/
    main.js            应用入口（注册 ElementPlus/Pinia/router/图标）
    App.vue
    api/               request.js(axios 封装+拦截器) + index.js(各资源接口)
    stores/auth.js     登录态（token + admin，含 isSuper）
    router/index.js    路由 + 守卫（登录/超管权限）
    layout/AdminLayout.vue  侧边菜单 + 顶栏（改密/退出）
    components/ImageUpload.vue  多图上传（排序/主图/删除）
    utils/format.js    分<->元、毫秒时间戳格式化
    utils/dict.js      订单/售后/配送状态字典（对齐后端 constants）
    views/             Login/ProductList/CategoryList/OrderList/AfterSaleList/UserList/AdminList/NotFound
```

## 1. 目标
给商家一个 Web 管理后台：登录、商品/分类管理（含 OSS 图片上传、上下架）、订单与发货、售后处理、用户查询、管理员多账号。所有业务逻辑**复用 pet-back `app/services`**，前端只调 `/api/v1/admin` 接口。

## 2. 后端 admin 接口现状（已存在，可直接用）
前缀 `/api/v1/admin`，鉴权 `Authorization: Bearer <admin token>`（`POST /auth/login` 用 `{username,password}` 换 token，轮换制）。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/login | 管理员登录，返回 `{token, admin}` |
| POST | /auth/logout | 登出 |
| GET | /auth/me | 当前管理员 |
| GET | /orders | 列表，`?status=&keyword=&afterSale=1`（keyword 匹配订单号/收货人/电话） |
| GET | /orders/:id | 详情（含 items/收货/物流/afterSale） |
| POST | /orders/:id/ship | 发货 `{carrier, shipNo}`（自提仅 shipNo） |
| POST | /orders/:id/refund | 管理员发起退款 `{refundFen, note}`（可部分退） |
| GET | /after-sales | 待处理售后单（PENDING） |
| POST | /after-sales/:id/approve | 同意退款 `{note}`（触发微信退款，全额→订单 REFUNDED） |
| POST | /after-sales/:id/reject | 驳回 `{note}` |
| POST | /upload/image | 上传图片（multipart `file`）→ `{url}`（OSS/本地由 `IMAGE_PROVIDER` 决定） |
| GET | /products | 商品列表 `?page=&pageSize=&keyword=&categoryId=&onSale=`（含下架，返回 `{list,total,page,pageSize,hasMore}`） |
| POST | /products | 创建商品 `{title,categoryId,priceFen,images[],desc,sort,onSale}` |
| GET | /products/:id | 商品详情（含 onSale/sort） |
| PUT | /products/:id | 更新商品（部分字段） |
| PATCH | /products/:id/on-sale | 上/下架 `{onSale}`（保留在库） |
| DELETE | /products/:id | 物理删除 + 删 OSS 图片（弱一致，不可恢复） |
| GET | /categories | 分类列表（含 productCount） |
| POST/PUT/DELETE | /categories[/:id] | 分类增改删（删除前校验无商品引用） |
| GET | /users | 用户列表 `?page=&pageSize=&keyword=`（手机号/昵称，含订单数） |
| GET | /users/:id | 用户详情（余额/累计消费/最近 10 单） |
| POST | /users/:id/balance-adjust | 手动调整余额 `{amountFen,note}`（可负；**仅超管**，记 source=ADMIN） |
| GET | /admins | 管理员列表（任何管理员可看） |
| POST/PUT/DELETE | /admins[/:id] | 管理员增改删（**仅超管**，非超管 403） |
| POST | /auth/change-password | 改自己密码 `{oldPassword,newPassword}`，成功后 token 全失效 |
| GET | /recharge-tiers | 充值活动档位列表（含 id/thresholdFen/giftFen/label/sub/sort） |
| POST | /recharge-tiers | 新增档位 `{thresholdFen,giftFen,label,sub,sort}` |
| PUT | /recharge-tiers/:id | 更新档位 |
| DELETE | /recharge-tiers/:id | 删除档位（**至少保留一个**，仅剩一条时 400） |
| GET | /shipping-config | 当前运费规则 `{baseFreightFen,freeThresholdFen,updatedAt}` |
| PUT | /shipping-config | 更新运费规则（分；0=不收/不启用） |
| GET | /order-config | 交易配置 `{autoCompleteDays}`（发货后自动确认/退款窗口天数） |
| PUT | /order-config | 更新交易配置 `{autoCompleteDays}`（1~365 天） |

响应统一 `{code,data,message}`；`code=0` 成功，401 未登录（前端拦截跳登录页），403 非超管。

## 3. 后端 admin 接口（F 已补全）
上述商品/分类/用户/管理员 CRUD 均已在 `pet-back` 实现：
- `products.on_sale`（bool，默认 true）、`admin_users.is_super`（bool）已由 `app/__init__.py:_auto_migrate()` 幂等 `ALTER TABLE` 补列（保留现有数据，未 reset）。
- 业务集中在 `app/services/catalog_service.py`；序列化 `serializers.admin_product/admin_account/admin_user`。
- client 端已过滤下架商品：列表仅 `on_sale=true`，详情对下架返回 404，购物车隐藏下架行，加购/下单遇下架报 400。
- **种子不再灌任何伪造业务数据**（`seed.py` 仅创建初始超管 admin；分类/商品/Banner/充值档位均不灌）；已一次性清理存量伪造数据（含 Banner/档位），方便管理端真实上架测试。小程序各页（首页/分类/搜索/详情/购物车/充值）均已验证空态不报错。

## 4. 前端页面清单（已实现路由）
- `/login` 登录 ✅
- `/products` 商品管理 ✅：**左分类侧栏 + 右商品卡片网格**（镜像小程序分类页结构，管理员所见即所得）；卡片含图/标题/价格/已售/上下架开关/编辑删除；编辑抽屉含多图上传（`ImageUpload.vue` 走 `/upload/image`，可排序/设主图/删除）。
- `/categories` 分类管理 ✅：表格 + 新建/编辑弹窗 + 删除（有商品引用时警告）。
- `/recharge-tiers` 充值活动 ✅：档位表格（充值/赠送/用户到账合计/文案/排序）+ 新增/编辑弹窗 + 删除；**仅剩一个档位时删除按钮置灰**（后端也会返回 400 拦截）。
- `/shipping` 运费设置 ✅：基础运费 + 包邮门槛（均以元录入、存分），实时预览生效规则文案；提示“仅影响新订单，历史订单已快照”。
- `/order-config` 交易设置 ✅：发货后自动确认收货天数（=已发货退款窗口，1~365 天，默认 7），自提与快递一致；提示“仅影响之后判定”。
- `/orders` 订单 ✅：tab 全部/待付款/待发货/**待收货/已完成**/售后中 + 搜索；详情抽屉（收货/物流/商品/售后，含商品金额/运费/合计拆分）；发货弹窗（**快递=公司+单号；自提无需单号，直接确认发货**）；发起退款弹窗（**已完成订单仍可强制退**）。
- `/after-sales` 售后 ✅：PENDING 列表 + 同意/驳回弹窗 + 跳订单。
- `/users` 用户 ✅：搜索（手机号/昵称）+ 分页列表 + 详情抽屉（含最近订单）；**超管可见「调整余额」**（弹窗输入元、支持负数扣减、实时预览调整后余额，并提示不计入充值预收）。
- `/admins` 管理员 ✅（**仅超管可见**，路由守卫 + 菜单过滤）：列表 + 新建/编辑/启用禁用/删除；顶栏「修改密码」全员可用。
- 404 兜底页 ✅。
- `/dashboard` 仪表盘 ✅（默认首页）：**今日/本月/自定义区间**三档（自定义带日期范围选择器）；周期指标卡（订单数/销售额/客单价/成交买家/新客/退款额）+ 实时待办（待发货/待处理售后，可点跳转）+ 每日销售趋势柱（仅月/自定义）+ 累计资金口径区（不随周期变）。
- `/banners` 广告牌管理 ✅：预览/标题/**跳转商品下拉**/排序/启停开关/编辑/删除；新建用 ImageUpload 传正方形大图（首页 hero）。
- `/audit-logs` 操作溯源 ✅（**仅超管**）：分页表格（时间/操作人/动作/目标/摘要/IP）+ 动作过滤。
- 导出 CSV ✅：订单/商品/用户页工具栏「导出CSV」（后端生成 utf-8-sig，blob 下载）。

## 5. 运行与联调
- 后端：`cd pet-back && make serve`（127.0.0.1:8000）。`.env` 已配好真实微信/OSS/支付凭证，**改 .env 必须重启**。
- 前端：`cd pet-web && npm install && npm run dev`（Vite `5173`，`/api` 与 `/uploads` 代理到后端）。后端地址默认 `http://127.0.0.1:8000`，可用 `VITE_BACKEND=http://host:port npm run dev` 覆盖（便于对隔离端口/临时库联调，不干扰真实服务）。
- 生产：`npm run build` 出 `dist/`，由 Nginx 静态托管 + 反代 `/api`、`/uploads` 到后端。
- 管理员初始账号 `admin / admin123`（seed 创建，超管；上线必改）。
- 图片上传返回 OSS 公网 https URL（或 local 模式 `/uploads/...`），可直接 `<img>`/小程序展示。

## 6. 开放决策（已由用户确认）
1. 交付粒度：**先核心后补齐**。第一批（登录/商品/分类/订单/售后/用户/管理员）已交付；第二批（仪表盘/Banner/充值档位）待做。
2. Banner/充值档位管理：**Banner 第二批**再做（当前已清空、无管理界面，需直接改库或等第二批 UI）；~~充值档位管理~~ **已上线（批次③）**。
3. 管理员：**多账号**（增删改/禁用/超管权限/改密）已做。
4. 商品上下架语义：**下架与删除分开**——下架=`on_sale=false`（保留可恢复）；删除=物理删库+删 OSS 图片（不可恢复）。
5. 前端端口/部署：dev 5173 代理后端；生产 Nginx 静态托管 + 反代。

## 7. 关键坑（必读）
- 订单状态机：`PENDING_PAY/PAID_UNSHIPPED/SHIPPED/CLOSED/REFUNDING/REFUNDED`；售后独立 `after_sales`（PENDING/REJECTED/REFUNDING/REFUNDED），"退款/售后"列表 = 有 PENDING 售后单的订单。
- 无库存概念（下单现做）；销量在支付成功时累加，全额退款回退。
- 金额一律"分"，时间戳一律毫秒；前端展示需转换。
- admin token 与小程序用户 token 是两套表，勿混用。
- 微信支付退款为同步记账态（REFUNDED），真实微信退款回调驱动 REFUNDING→REFUNDED 尚未接（掉单查单补偿也未做）。
