# Vercel、Render 与 Supabase 免费部署实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Vue 前端部署到 Vercel、Fastify API 部署到 Render，并让 API 使用全新空白的 Supabase PostgreSQL。

**Architecture:** Vercel 以 `frontend/` 作为项目根目录，构建时写入公开的 Render API 根地址。Render 的 Blueprint 只声明 Fastify Web Service，使用平台私密变量连接 Supabase PostgreSQL 并在构建阶段运行既有迁移。CORS 仅放行配置的 Vercel 生产域名，未配置时保留本地开发兼容行为。

**Tech Stack:** Vue 3 + Vite、Fastify、PostgreSQL、Supabase、Render、Vercel、Vitest。

## Global Constraints

- Supabase 从空数据库开始；不导入 `backend/data/dev.db` 或上传文件。
- `DATABASE_URL`、`AI_API_KEY` 及任何 Supabase 密钥不得写入 Git。
- Vercel 只设置公开的 `VITE_API_BASE_URL`。
- 免费层限制需在 README 中明确：Render API 15 分钟空闲后冷启动，Supabase 低活动 7 天可能暂停。
- 完成前运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`。

---

### Task 1: 为生产前端域名收紧 CORS

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/plugins/cors.ts`
- Modify: `backend/.env.example`
- Create: `backend/src/plugins/cors.test.ts`

**Interfaces:**
- Consumes: `CORS_ORIGIN?: string` 环境变量。
- Produces: 当 `CORS_ORIGIN` 有值时仅允许该 Origin；未设置时继续使用 Fastify 的反射 Origin 行为，避免破坏本地开发。

- [ ] **Step 1: 写入 CORS 允许来源的失败测试**

在 `backend/src/plugins/cors.test.ts` 中单独注册 `corsPlugin`，使用 `app.inject` 验证显式生产域名被允许、其他来源不返回 `access-control-allow-origin`：

```ts
process.env.CORS_ORIGIN = 'https://jobsearching.vercel.app'
const app = Fastify()
await app.register(corsPlugin)
app.get('/probe', async () => ({ ok: true }))

const allowed = await app.inject({
  method: 'GET',
  url: '/probe',
  headers: { origin: 'https://jobsearching.vercel.app' },
})
assert.equal(allowed.headers['access-control-allow-origin'], 'https://jobsearching.vercel.app')

const rejected = await app.inject({
  method: 'GET',
  url: '/probe',
  headers: { origin: 'https://untrusted.example' },
})
assert.equal(rejected.headers['access-control-allow-origin'], undefined)
```

- [ ] **Step 2: 运行测试，确认当前宽松 CORS 使其失败**

Run: `node --import tsx --test src/plugins/cors.test.ts`

Expected: FAIL，因为当前 `origin: true` 会反射任意 Origin。

- [ ] **Step 3: 添加可选环境变量并实现允许来源逻辑**

在 `EnvSchema` 增加：

```ts
CORS_ORIGIN: z.string().url().optional(),
```

在 `cors.ts` 使用：

```ts
origin: env.CORS_ORIGIN ?? true,
```

保留现有 `credentials` 和 HTTP 方法列表。更新 `.env.example`：

```env
# Production only: exact Vercel frontend URL, for example https://your-project.vercel.app
# CORS_ORIGIN=https://your-project.vercel.app
```

- [ ] **Step 4: 运行测试、类型检查和 lint**

Run: `node --import tsx --test src/plugins/cors.test.ts && npm run type-check && npm run lint`

Expected: exit 0。

- [ ] **Step 5: 提交 CORS 配置**

```bash
git add backend/src/config/env.ts backend/src/plugins/cors.ts backend/src/plugins/cors.test.ts backend/.env.example
git commit -m "feat: configure deployment CORS origin"
```

### Task 2: 将 Render Blueprint 限定为 API 服务

**Files:**
- Modify: `render.yaml`

**Interfaces:**
- Consumes: Render Dashboard 中设置的 `DATABASE_URL`、`AI_API_KEY`、`CORS_ORIGIN`。
- Produces: 一个从 `backend/` 构建的 Render API Web Service；不创建 Render 数据库或静态站点。

- [ ] **Step 1: 更新 Blueprint 的失败前检查**

Run:

```bash
rg -n 'databases:|type: web|type: static|fromDatabase|VITE_API_BASE_URL' render.yaml
```

Expected: 当前结果包含数据库、API 和静态站点，确认需要缩小 Blueprint。

- [ ] **Step 2: 将 `render.yaml` 改为仅声明 API**

保持 API 的 `name`、`runtime`、`branch`、`rootDir`、构建命令、启动命令及 `/health` 检查。删除：

```yaml
databases:
  - name: jobsearching-db
```

以及整个 `jobsearching-web-aaapaythonmaster` 静态站点定义。删除 `DATABASE_URL.fromDatabase`，改为由 Render Dashboard 添加的私密环境变量；在 `envVars` 中保留 `DB_DIALECT=postgres`，增加 `CORS_ORIGIN` 的 `sync: false` 声明，并保持 `AI_API_KEY` 为 `sync: false`。

- [ ] **Step 3: 静态检查 Blueprint 不包含本地或数据库秘密**

Run:

```bash
rg -n 'databases:|type: static|fromDatabase|postgresql://|AI_API_KEY: [^s]' render.yaml
```

Expected: 无输出；`AI_API_KEY` 只以 `sync: false` 的 Render 私密变量形式存在。

- [ ] **Step 4: 提交 Blueprint 调整**

```bash
git add render.yaml
git commit -m "chore: deploy API through Render only"
```

### Task 3: 更新部署说明并执行本地验收

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1 的 `CORS_ORIGIN`、Task 2 的 Render API 服务、Supabase 的连接串、Vercel 的 `VITE_API_BASE_URL`。
- Produces: 一套按 Supabase → Render → Vercel 顺序执行的无秘密部署指南。

- [ ] **Step 1: 将“Render 免费部署”章节替换为“三平台免费部署”**

文档必须包含：

1. 在 Supabase 新建空白 Free 项目，从 **Connect** 复制 PostgreSQL 连接串。
2. 在 Render 从 GitHub `main` 新建 Blueprint；填写 `DATABASE_URL`、`AI_API_KEY`，创建后记录 Render API URL，并设置 `CORS_ORIGIN` 为最终 Vercel URL。
3. 在 Vercel 导入同一 GitHub 仓库，将 **Root Directory** 设置为 `frontend`，设置 `VITE_API_BASE_URL=https://<render-api>.onrender.com/api`，再部署。
4. 在 Render 将 `CORS_ORIGIN` 更新为 Vercel 生产 URL 后手动重启/重新部署 API。
5. 使用 `/health`、前端路由刷新、创建一条岗位来验收空白线上数据库。
6. 明确 AI 功能需要在 Render 提供有效 `AI_API_KEY`；本地 SQLite 和上传文件不会迁移。
7. 明确免费层冷启动/暂停限制与不能放置秘密的规则。

- [ ] **Step 2: 运行完整本地验证**

Run:

```bash
cd frontend && npm test && npm run build
cd ../backend && node --import tsx --test src/plugins/cors.test.ts src/modules/interview-prep/interview-prep.repository.test.ts && npm run build
cd .. && bash .agents/skills/vibecoding-verify/scripts/verify.sh
git diff --check
```

Expected: 所有命令 exit 0，最后输出 `verify: ALL PASSED`。

- [ ] **Step 3: 提交文档和验证后改动**

```bash
git add README.md
git commit -m "docs: guide Vercel Render Supabase deployment"
```

### Task 4: 在平台创建空白线上环境并验收

**Files:**
- No repository file changes expected.

**Interfaces:**
- Consumes: 用户已登录的 Supabase、Render、Vercel 账户及 Task 1–3 的已推送 `main`。
- Produces: 一个公开 Vercel 前端、一个 Render API 和一个空白 Supabase PostgreSQL。

- [ ] **Step 1: 创建 Supabase 空白 PostgreSQL 项目**

在 Supabase 创建 Free 项目；不执行本地 SQLite 导入。复制仅供 Render 使用的 PostgreSQL 连接串，不将其粘贴到仓库或对话输出。

- [ ] **Step 2: 创建 Render Blueprint 并添加私密变量**

在 Render 从 GitHub `main` 创建 Blueprint；设置 `DATABASE_URL`、`AI_API_KEY` 和初始临时 `CORS_ORIGIN`。等待构建执行 `npm run db:migrate` 并检查：

```text
GET https://<render-api>.onrender.com/health
```

Expected: HTTP 200，响应含 `dialect: "postgres"`。

- [ ] **Step 3: 创建 Vercel 前端项目**

在 Vercel 导入仓库，设置 Root Directory 为 `frontend`；设置生产环境变量：

```text
VITE_API_BASE_URL=https://<render-api>.onrender.com/api
```

部署后复制生产域名。

- [ ] **Step 4: 收紧 Render CORS 并复测**

将 Render 的 `CORS_ORIGIN` 改为 Vercel 生产域名，重新部署 API；在 Vercel 页面创建一条岗位后刷新页面。

Expected: 新记录可读回，说明 Supabase 空数据库迁移和前后端连接均成功。

- [ ] **Step 5: 记录公开地址并确认秘密未暴露**

仅在 README 或交付说明中记录 Vercel 与 Render 的公开 URL；不记录数据库连接串和 AI key。

