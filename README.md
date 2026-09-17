# Job Searching MVP

个人求职工作台，用于保存 Boss 直聘 JD、管理基础简历、生成 HR 打招呼内容、基于 JD 调整简历，以及提取一批 JD 的共性要求。

## 功能范围

- 岗位 JD 管理：新增、筛选、详情编辑、删除岗位。
- 求职状态管理：自定义状态名称、颜色和排序。
- 基础简历管理：上传 Word/PDF，提取文本，保存多份基础简历。
- HR 打招呼生成：基于单条 JD 调用智谱 AI 生成 Boss 直聘开场内容，并保存历史草稿。
- 调整版简历生成：选择基础简历和目标 JD，生成投递该岗位用的简历草稿，原始简历不被修改。
- JD 共性分析：手动选择一批 JD，按岗位方向分组提取共性技能、经验、工具、软性要求和风险提醒。

## 技术栈

- Frontend: Vue 3, TypeScript, Less, Vite, Pinia, Vue Router
- Backend: Node.js, Fastify, TypeScript, zod
- Database: SQLite for local use, PostgreSQL-compatible migration files
- AI Provider: Zhipu AI OpenAI-compatible chat completions

## 稳定预览方式

开发预览固定使用本仓库目录 `/Users/elijah/Downloads/jobsearching-mvp`，避免前端连到旧模板目录的后端。

在仓库根目录运行：

```bash
bash scripts/stop-preview.sh
bash scripts/dev-preview.sh
bash scripts/status-preview.sh
```

预览页面只打开：

```text
http://127.0.0.1:5176/job-search/jobs
```

脚本会固定启动：

- Backend: `http://127.0.0.1:3001`
- Frontend: `http://127.0.0.1:5176`
- Logs: `.dev/backend.log` 和 `.dev/frontend.log`

不要直接在浏览器打开 `POST` API 地址，例如 `/api/job-search/jobs/extract-jd-image`。JD 截图识别必须从页面里的“上传 JD 截图并识别”按钮上传图片触发。

## 本地启动

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend 默认运行在 `http://localhost:3000`。

在 `backend/.env` 中配置智谱 AI：

```env
AI_PROVIDER=zhipu
AI_MODEL=glm-5.2
AI_OCR_MODEL=glm-ocr
AI_BASE_URL=https://api.z.ai/api/paas/v4
# 如果终端/Node 无法直连 AI 服务，可填本机代理，例如 Clash 常见端口：
# AI_PROXY_URL=http://127.0.0.1:7897
AI_API_KEY=你的智谱 AI API Key
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend 默认运行在 `http://localhost:5173`，并将 `/api` 代理到 `http://localhost:3000`。

如果 `3000` 已被其他服务占用，可以让后端和前端代理使用另一个端口：

```bash
cd backend
PORT=3001 npm run dev

cd ../frontend
VITE_API_PROXY_TARGET=http://localhost:3001 npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

## 验证

在仓库根目录运行：

```bash
bash .agents/skills/vibecoding-verify/scripts/verify.sh
```

成功时会输出：

```text
verify: ALL PASSED
```

也可以分别运行：

```bash
cd backend
npm run type-check
npm run lint

cd ../frontend
npm run type-check
npm run lint
```

## 数据说明

- 本地默认使用 SQLite。
- 上传的原始简历文件保存在 `backend/data/job-search/resumes/`。
- `backend/data/` 已被 git 忽略，不会提交个人数据、数据库文件或上传文件。
- `.env` 已被 git 忽略，不要提交真实 API Key。

## 免费公网部署（Supabase + Render + Vercel）

本项目使用 **Vercel 托管前端、Render 托管 API、Supabase 托管 PostgreSQL**。首次上线会创建一个空数据库；本地 SQLite 数据和 `backend/data/` 中的个人文件不会上传。

### 1. 创建 Supabase 数据库

1. 在 Supabase 创建一个免费项目，并保存数据库连接串。
2. 不要把连接串或 Supabase 密钥写入前端；它只应作为 Render 的 `DATABASE_URL`。

### 2. 部署 Render API

1. 在 Render 选择 **New > Blueprint**，连接 GitHub 仓库。
2. Render 会读取根目录的 `render.yaml`，仅创建 Fastify API 服务。
3. 在服务的环境变量中填写下列私密值：
   - `DATABASE_URL`：Supabase PostgreSQL 连接串。
   - `AI_API_KEY`：智谱 API 密钥。
   - `CORS_ORIGIN`：完成 Vercel 部署后填入完整前端地址，例如 `https://your-project.vercel.app`。
4. 等待构建完成；构建过程会运行 `npm run db:migrate`，为空数据库创建表结构。
5. 访问 `https://<你的-render-服务>.onrender.com/health`，确认 API 和数据库可用。

### 3. 部署 Vercel 前端

1. 在 Vercel 导入同一个 GitHub 仓库。
2. 将 **Root Directory** 设为 `frontend`；Vercel 会自动识别 Vite，构建输出为 `dist`。
3. 添加环境变量 `VITE_API_BASE_URL`，值为 `https://<你的-render-服务>.onrender.com/api`。
4. 部署完成后，将生成的 Vercel 地址填回 Render 的 `CORS_ORIGIN` 并重新部署 API。

### 上线验收与免费额度说明

打开 Vercel 地址后，创建一条求职记录并刷新页面；数据应保留在 Supabase。`AI_API_KEY`、数据库连接串和其他私密变量只保存在 Render，绝不放在 Git 或 Vercel 前端变量中。

Render 免费 Web Service 闲置约 15 分钟后会休眠，首次唤醒通常需要等待约一分钟；Supabase 免费项目长时间无活动后可能暂停，访问控制台后可恢复。这套组合适合个人预览和使用，不产生固定月费。

## 项目结构

```text
.
├── backend/
│   └── src/modules/job-search/
│       ├── job-search.schema.ts
│       ├── job-search.repository.ts
│       ├── job-search.service.ts
│       ├── job-search.controller.ts
│       ├── job-search.routes.ts
│       └── migrations/
└── frontend/
    └── src/modules/job-search/
        ├── api/
        ├── store/
        ├── types/
        ├── views/
        └── routes.ts
```

## 当前 MVP 不包含

- 多用户账号和权限。
- Word/PDF 导出调整版简历。
- 复杂投递统计图表。
- 自动抓取 Boss 直聘数据。
- 生产环境鉴权。
