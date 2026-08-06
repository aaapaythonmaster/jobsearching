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

## Render 免费部署

仓库根目录的 `render.yaml` 会创建 Vue 静态站点、Fastify Web Service 和 PostgreSQL：

1. 登录 Render，选择 **New > Blueprint**。
2. 连接 GitHub 仓库 `aaapaythonmaster/jobsearching`。
3. Render 读取根目录 `render.yaml` 后，填写后端的 `AI_API_KEY`。
4. 创建 Blueprint，等待数据库、API 和前端依次完成部署。
5. 访问前端地址，并打开后端 `/health` 检查数据库连接。

免费 Web Service 会在闲置后休眠，首次请求可能需要等待。免费 PostgreSQL 会在 30 天后到期；本方案仅用于预览，长期使用请升级或迁移数据库。

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
