# Vercel、Render 与 Supabase 免费部署设计

## 目标

将当前项目从本地 SQLite 体验扩展为一个免费的公网预览环境：Vercel 托管 Vue 前端，Render 托管 Fastify API，Supabase 托管一个全新的空 PostgreSQL 数据库。线上环境不迁移本地个人数据。

## 当前结构

- `frontend/` 是 Vue 3 + Vite 静态前端；`frontend/src/utils/request.ts` 已支持通过 `VITE_API_BASE_URL` 覆盖默认 `/api` 基址。
- `backend/` 是 Fastify 服务；`backend/src/server.ts` 已从 `PORT`、`HOST` 启动服务。
- `backend/src/config/env.ts` 支持 `DB_DIALECT=postgres` 和 `DATABASE_URL`。
- `backend` 使用现有 PostgreSQL 迁移；`npm run db:migrate` 会在部署构建阶段创建空库所需表。
- 根目录现有 `render.yaml` 同时声明 Render 前端、API 和 Render PostgreSQL，须改为仅声明 API。

## 方案比较

1. **Vercel + Render + Supabase（采用）**：保留当前 Fastify 运行模型，数据库不使用会在 30 天后过期的 Render 免费 PostgreSQL。
2. 全部 Render：部署步骤最少，但免费数据库 30 天后过期，不适合保存求职记录。
3. 全部 Vercel：需要把 Fastify 重构为 Serverless，超出当前部署范围。

## 目标架构

```text
GitHub main
  ├─ Vercel（frontend/）
  │    └─ VITE_API_BASE_URL = https://<render-api>/api
  └─ Render Web Service（backend/）
       ├─ DATABASE_URL = <Supabase PostgreSQL connection string>
       ├─ DB_DIALECT = postgres
       └─ AI_API_KEY = Render 私密环境变量
            └─ Supabase PostgreSQL（全新空数据库）
```

## 变更边界

- 修改 `render.yaml`：移除 Render 静态站点和 Render 数据库资源，只保留 API Web Service；不在仓库写入任何真实 URL 或秘密。
- 新增 Vercel 配置/部署说明：Vercel 项目根目录使用 `frontend/`，构建时注入 Render API URL。
- 更新 `README.md`：提供 Supabase → Render → Vercel 的创建顺序、变量表、迁移与验收步骤。
- 不修改业务模块、数据库 schema、前端功能或本地 `.env`。
- 不迁移 `backend/data/dev.db` 中的本地 SQLite 数据；Supabase 从空库开始。

## 配置与安全

- Supabase 仅向 Render 提供 PostgreSQL 连接串；前端不使用 Supabase URL、anon key 或 service role key。
- `AI_API_KEY` 仅存储在 Render 环境变量中；不写入 GitHub、Vercel 或仓库文件。
- Vercel 仅持有公开的 `VITE_API_BASE_URL`。
- Render 的 CORS 配置将限定为 Vercel 的生产域名；本地开发仍保留现有本地来源。

## 运行和错误处理

- Render 构建顺序：安装依赖、构建、执行 `npm run db:migrate`，成功后启动 Fastify。
- 迁移失败时阻止 API 部署，避免应用连接到不完整的空数据库。
- `/health` 继续作为 Render 健康检查。
- 免费 Render API 空闲 15 分钟会休眠，首次访问会有冷启动；Supabase 免费项目连续 7 天低活动可能暂停，之后可在控制台恢复。

## 验收

- 本地前后端测试、构建与 `bash .agents/skills/vibecoding-verify/scripts/verify.sh` 通过。
- Supabase 连接后，Render `/health` 返回成功，且迁移表已创建。
- Vercel 前端可加载，`/api` 请求指向 Render API，Vue SPA 路由刷新正常。
- 线上从空数据库创建一条岗位，并确认刷新后可读回。
