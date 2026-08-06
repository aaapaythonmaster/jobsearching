# Render Free Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Vue frontend, Fastify backend, and PostgreSQL database to Render's free tier from the GitHub `main` branch.

**Architecture:** Render hosts the frontend as a Static Site and the backend as a conventional Web Service. The frontend receives the backend `/api` URL at Vite build time, while local development retains the relative `/api` base; Render Postgres supplies `DATABASE_URL` and backend migrations run during deployment.

**Tech Stack:** Render Blueprint, Vue 3, Vite, Vitest, Fastify, PostgreSQL, TypeScript

## Global Constraints

- Preserve SQLite as the zero-configuration local default.
- Do not change business modules, API schemas, database migrations, or page behavior.
- Never commit `AI_API_KEY` or `DATABASE_URL` values.
- Use Render free plans for the Web Service and PostgreSQL.
- Run `bash .agents/skills/vibecoding-verify/scripts/verify.sh` before completion.

---

## File Structure

- `frontend/src/utils/request.ts`: Selects the relative local API base or the build-time Render API base.
- `frontend/src/utils/request.test.ts`: Verifies URL construction through observable fetch calls.
- `render.yaml`: Declares the database, Fastify Web Service, Vue Static Site, environment variables, build commands, health check, and SPA rewrite.
- `README.md`: Documents one-click Blueprint deployment, required secret entry, URLs, and free-tier limitations.

### Task 1: Build-time API Base URL

**Files:**
- Create: `frontend/src/utils/request.test.ts`
- Modify: `frontend/src/utils/request.ts`

**Interfaces:**
- Consumes: Vite build variable `import.meta.env.VITE_API_BASE_URL`.
- Produces: `request()` calls relative `/api/...` locally and `${VITE_API_BASE_URL}/...` in Render builds, with trailing slashes normalized.

- [ ] **Step 1: Write the failing tests**

Create tests that reset modules, stub `fetch`, and assert the actual requested URL:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('request API base URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('uses /api by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: {}, message: 'ok' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { request } = await import('./request')
    await request('/health')
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.any(Object))
  })

  it('uses and normalizes VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://jobsearching-api-aaapaythonmaster.onrender.com/api/')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: {}, message: 'ok' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { request } = await import('./request')
    await request('/jobs')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://jobsearching-api-aaapaythonmaster.onrender.com/api/jobs',
      expect.any(Object),
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd frontend && npm test -- src/utils/request.test.ts`

Expected: the production URL assertion fails because `request.ts` still uses `/api`.

- [ ] **Step 3: Implement minimal API base selection**

Replace the fixed constant with:

```ts
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const DEFAULT_BASE_URL = configuredBaseUrl ? configuredBaseUrl.replace(/\/+$/, '') : '/api'
```

- [ ] **Step 4: Run the focused and full frontend tests**

Run: `cd frontend && npm test -- src/utils/request.test.ts && npm test`

Expected: both new tests pass and the full suite passes.

- [ ] **Step 5: Commit the tested API configuration**

```bash
git add frontend/src/utils/request.ts frontend/src/utils/request.test.ts
git commit -m "feat: configure production API base URL"
```

### Task 2: Render Blueprint and Deployment Documentation

**Files:**
- Create: `render.yaml`
- Modify: `README.md`

**Interfaces:**
- Consumes: GitHub `main`, backend `/health`, backend scripts `build`, `db:migrate`, and `start`.
- Produces: Render services `jobsearching-api-aaapaythonmaster`, `jobsearching-web-aaapaythonmaster`, and database `jobsearching-db`.

- [ ] **Step 1: Add the Render Blueprint**

Create `render.yaml`:

```yaml
databases:
  - name: jobsearching-db
    plan: free
    databaseName: jobsearching
    user: jobsearching

services:
  - type: web
    name: jobsearching-api-aaapaythonmaster
    runtime: node
    plan: free
    branch: main
    rootDir: backend
    buildCommand: npm ci --include=dev && npm run build && npm run db:migrate
    startCommand: npm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: HOST
        value: 0.0.0.0
      - key: DB_DIALECT
        value: postgres
      - key: DATABASE_URL
        fromDatabase:
          name: jobsearching-db
          property: connectionString
      - key: AI_PROVIDER
        value: zhipu
      - key: AI_MODEL
        value: glm-5.2
      - key: AI_OCR_MODEL
        value: glm-ocr
      - key: AI_BASE_URL
        value: https://api.z.ai/api/paas/v4
      - key: AI_API_KEY
        sync: false

  - type: web
    name: jobsearching-web-aaapaythonmaster
    runtime: static
    branch: main
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    autoDeploy: true
    envVars:
      - key: VITE_API_BASE_URL
        value: https://jobsearching-api-aaapaythonmaster.onrender.com/api
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

- [ ] **Step 2: Document deployment and free-tier behavior**

Add a README section with:

```md
## Render 免费部署

1. 登录 Render，选择 **New > Blueprint**。
2. 连接 GitHub 仓库 `aaapaythonmaster/jobsearching`。
3. Render 读取根目录 `render.yaml` 后，填写后端的 `AI_API_KEY`。
4. 创建 Blueprint，等待数据库、API 和前端依次完成部署。
5. 访问前端地址，并用后端 `/health` 确认数据库连接。

免费 Web Service 会在闲置后休眠；免费 PostgreSQL 会在 30 天后到期。本方案仅用于预览，长期使用请升级或迁移数据库。
```

- [ ] **Step 3: Validate Blueprint syntax and repository diff**

Run:

```bash
git diff --check
rg -n "AI_API_KEY|DATABASE_URL|VITE_API_BASE_URL|healthCheckPath" render.yaml README.md
```

Expected: no whitespace errors; only secret placeholders/references appear, with no real key or database URL.

- [ ] **Step 4: Commit deployment configuration**

```bash
git add render.yaml README.md
git commit -m "feat: add Render deployment blueprint"
```

### Task 3: Verification, Push, and Render Provisioning

**Files:**
- Verify: repository root, `frontend/`, `backend/`

**Interfaces:**
- Consumes: committed Blueprint and GitHub `main`.
- Produces: green local verification, updated remote `main`, and Render service URLs.

- [ ] **Step 1: Run repository verification**

Run: `bash .agents/skills/vibecoding-verify/scripts/verify.sh`

Expected: `verify: ALL PASSED`.

- [ ] **Step 2: Run tests and production builds**

Run:

```bash
(cd frontend && npm test && npm run build)
(cd backend && npm run build)
```

Expected: all frontend tests pass and both builds exit 0.

- [ ] **Step 3: Push the current commit to remote main**

Run: `git push origin HEAD:main`

Expected: GitHub `main` points to the local HEAD commit.

- [ ] **Step 4: Create the Render Blueprint through the dashboard**

Open `https://dashboard.render.com/blueprints`, connect `aaapaythonmaster/jobsearching`, select `main`, enter `AI_API_KEY`, and approve the free resources.

Expected: Render provisions the PostgreSQL database, backend Web Service, and frontend Static Site.

- [ ] **Step 5: Verify the live deployment**

Run:

```bash
curl --fail --show-error https://jobsearching-api-aaapaythonmaster.onrender.com/health
curl --fail --show-error --head https://jobsearching-web-aaapaythonmaster.onrender.com/job-search/jobs
```

Expected: `/health` returns a success envelope with PostgreSQL dialect, and the SPA route returns HTTP 200.
