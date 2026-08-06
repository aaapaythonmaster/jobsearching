# Render 免费部署设计

## 目标

将当前开源求职管理项目部署到 Render 免费方案，得到可访问的公网前端和后端。部署使用 GitHub `main` 分支自动构建，不改变本地 SQLite 默认体验。

## 当前结构

- `frontend/` 是 Vue 3 + Vite 静态前端，生产构建产物位于 `frontend/dist/`。
- `frontend/src/utils/request.ts` 当前固定以 `/api` 为 API 基址，本地开发由 Vite 代理到 Fastify。
- `backend/` 是 Fastify 服务，`backend/src/server.ts` 已监听环境变量 `PORT` 和 `HOST`。
- `backend/src/config/env.ts` 已支持 `DB_DIALECT=postgres` 与 `DATABASE_URL`。
- PostgreSQL 迁移通过 `npm run db:migrate` 执行；服务健康检查为 `/health`。

## 方案选择

采用三个 Render 资源：

1. Vue Static Site，提供前端页面和 SPA fallback。
2. Fastify Web Service，提供 `/api/*` 与 `/health`。
3. 免费 Render PostgreSQL，向后端注入内部连接地址。

没有选择让 Fastify托管前端，因为这会扩大后端职责和构建流程。没有使用静态站点代理，因为它会让 Blueprint 依赖固定服务域名。

## 目标架构

- 根目录新增 `render.yaml`，声明数据库、后端服务和前端静态站点。
- 后端构建命令安装依赖、构建 TypeScript 并执行 PostgreSQL 迁移；启动命令继续使用现有 `npm start`。
- 后端设置 `NODE_ENV=production`、`HOST=0.0.0.0`、`DB_DIALECT=postgres`、数据库连接及 AI 配置。
- 前端构建时通过 `VITE_API_BASE_URL` 注入后端公网地址。
- `request.ts` 在存在构建变量时使用该地址，否则继续使用 `/api`，保证本地开发不变。
- Static Site 配置 SPA rewrite，将前端路由回退到 `index.html`。

## 配置与秘密

- 非敏感默认值写入 Blueprint。
- `AI_API_KEY` 不写入 Git；在 Render 创建 Blueprint 时由用户填写或在 Dashboard 中设置。
- 免费 PostgreSQL 连接地址通过 Render 资源引用注入，不写入仓库。
- CORS 继续使用现有配置，以允许独立前端域名访问后端。

## 错误处理

- 数据库迁移失败时阻止后端构建完成，避免在缺表状态启动。
- `/health` 用作 Render 健康检查。
- 未配置 AI 密钥时，基础岗位管理仍可运行；依赖 AI/OCR 的功能会按现有业务错误处理返回提示。

## 免费方案限制

- 免费 Web Service 闲置后会休眠，首次请求可能明显变慢。
- 免费 PostgreSQL 容量有限，并在 30 天后到期；本次部署仅作为临时预览。
- 后续转长期使用时，应升级数据库或迁移到其他持久 PostgreSQL。

## 变更边界

预计修改：

- `render.yaml`
- `frontend/src/utils/request.ts`
- 对应的前端单元测试（若需新增以覆盖 API 基址）
- `README.md`

不修改业务模块、API schema、数据库迁移和页面功能。

## 验证

- 前端 API 基址测试：默认 `/api`，生产变量下使用外部后端地址。
- `npm test`（前端）。
- `npm run build`（前端和后端）。
- `bash .agents/skills/vibecoding-verify/scripts/verify.sh`。
- 推送后检查 Render `/health`、前端加载、SPA 刷新和一次基础 API 请求。
