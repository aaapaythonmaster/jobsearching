# Job Searching MVP

个人求职工作台，用于保存 Boss 直聘 JD、管理基础简历、生成 HR 打招呼内容、基于 JD 调整简历，以及提取一批 JD 的共性要求。

## 功能范围

- 岗位 JD 管理：新增、筛选、详情编辑、删除岗位。
- 求职状态管理：自定义状态名称、颜色和排序。
- 基础简历管理：上传 Word/PDF，提取文本，保存多份基础简历。
- HR 打招呼生成：基于单条 JD 调用 DeepSeek 生成 Boss 直聘开场内容，并保存历史草稿。
- 调整版简历生成：选择基础简历和目标 JD，生成投递该岗位用的简历草稿，原始简历不被修改。
- JD 共性分析：手动选择一批 JD，按岗位方向分组提取共性技能、经验、工具、软性要求和风险提醒。

## 技术栈

- Frontend: Vue 3, TypeScript, Less, Vite, Pinia, Vue Router
- Backend: Node.js, Fastify, TypeScript, zod
- Database: SQLite for local use, PostgreSQL-compatible migration files
- AI Provider: DeepSeek

## 本地启动

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend 默认运行在 `http://localhost:3000`。

在 `backend/.env` 中配置 DeepSeek：

```env
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=你的 DeepSeek API Key
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend 默认运行在 `http://localhost:5173`，并将 `/api` 代理到 `http://localhost:3000`。

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
- 在线部署和生产环境鉴权。
