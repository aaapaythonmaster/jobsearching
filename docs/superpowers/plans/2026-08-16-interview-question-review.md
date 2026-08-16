# Interview Question Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level “面试” workspace entry that lists every job with its recorded-question count and provides a focused page for saving interview round plus question text.

**Architecture:** Extend the existing closed-loop `interview-prep` module. The backend adds one aggregate read endpoint over existing job and interview-question tables; the frontend adds overview/detail routes and dedicated store state while preserving the existing interview-preparation page and APIs.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Less, Fastify, zod, SQLite/Postgres database interface, Vitest, Node test runner through `tsx`.

## Global Constraints

- New workspace route names are `interview-overview` and `interview-question-review`.
- New route paths are `/interviews` and `/interviews/:jobPostId`.
- The new detail page records only round, optional custom round, and question text.
- Do not add a database migration; reuse `interview_prep_questions`.
- Do not remove or modify the behavior of the existing `/job-search/jobs/:jobPostId/interview-prep` page.
- Do not expose answer analysis, resume binding, introductions, FAQs, ratings, outcomes, or summaries in the new pages.
- Backend response shapes remain `{ code: number, data: T, message: string }`.
- Frontend network access stays inside `frontend/src/modules/interview-prep/api/index.ts`.
- Backend SQL stays inside `backend/src/modules/interview-prep/interview-prep.repository.ts` and uses the shared `db` interface with `?` placeholders.
- Implement in `codex/ripple-landing-preview`; do not merge into `main` before user acceptance.

---

### Task 1: Backend interview-project overview contract

**Files:**
- Create: `backend/src/modules/interview-prep/interview-prep.repository.test.ts`
- Modify: `backend/src/modules/interview-prep/interview-prep.schema.ts`
- Modify: `backend/src/modules/interview-prep/interview-prep.types.ts`
- Modify: `backend/src/modules/interview-prep/interview-prep.repository.ts`
- Modify: `backend/src/modules/interview-prep/interview-prep.service.ts`
- Modify: `backend/src/modules/interview-prep/interview-prep.controller.ts`
- Modify: `backend/src/modules/interview-prep/interview-prep.routes.ts`

**Interfaces:**
- Consumes: existing `job_search_job_posts` and `interview_prep_questions` tables.
- Produces: `InterviewProjectOverviewDto`, `interviewPrepRepository.listProjectOverviews()`, `interviewPrepService.listProjectOverviews()`, and `GET /api/interview-prep/projects`.

- [ ] **Step 1: Write the failing repository integration test**

Create `interview-prep.repository.test.ts` using an isolated in-memory SQLite database. Set environment variables before dynamic imports, initialize migrations, insert two jobs and two questions, then assert count, nullable timestamp, and ordering:

```ts
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_SQLITE_FILE = ':memory:'

let db: typeof import('@/db').db
let closeDb: typeof import('@/db').closeDb
let repository: typeof import('./interview-prep.repository').interviewPrepRepository

before(async () => {
  const database = await import('@/db')
  db = database.db
  closeDb = database.closeDb
  await database.initDb()
  repository = (await import('./interview-prep.repository')).interviewPrepRepository

  await db.execute(
    `INSERT INTO job_search_job_posts
     (id, company_name, job_title, job_direction, jd_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['job-old', '旧公司', '前端工程师', '前端', 'JD', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'],
  )
  await db.execute(
    `INSERT INTO job_search_job_posts
     (id, company_name, job_title, job_direction, jd_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['job-new', '新公司', '产品经理', '产品', 'JD', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'],
  )
  for (const [id, createdAt] of [
    ['question-1', '2026-08-10T10:00:00.000Z'],
    ['question-2', '2026-08-11T10:00:00.000Z'],
  ]) {
    await db.execute(
      `INSERT INTO interview_prep_questions
       (id, job_post_id, round_label, question_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'job-old', '初面', `问题 ${id}`, createdAt, createdAt],
    )
  }
})

after(async () => closeDb())

test('lists all jobs with question totals and most recent question first', async () => {
  assert.deepEqual(await repository.listProjectOverviews(), [
    {
      jobPostId: 'job-old',
      companyName: '旧公司',
      jobTitle: '前端工程师',
      questionCount: 2,
      latestQuestionAt: '2026-08-11T10:00:00.000Z',
    },
    {
      jobPostId: 'job-new',
      companyName: '新公司',
      jobTitle: '产品经理',
      questionCount: 0,
      latestQuestionAt: null,
    },
  ])
})
```

- [ ] **Step 2: Run the backend test and verify RED**

Run:

```bash
cd backend
npx tsx --test src/modules/interview-prep/interview-prep.repository.test.ts
```

Expected: FAIL because `listProjectOverviews` does not exist.

- [ ] **Step 3: Define the zod and repository row contracts**

Add to `interview-prep.schema.ts`:

```ts
export const InterviewProjectOverviewSchema = z.object({
  jobPostId: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  questionCount: z.number().int().nonnegative(),
  latestQuestionAt: z.string().nullable(),
})

export type InterviewProjectOverviewDto = z.infer<typeof InterviewProjectOverviewSchema>
```

Add to `interview-prep.types.ts`:

```ts
export interface InterviewProjectOverviewRow {
  job_post_id: string
  company_name: string
  job_title: string
  question_count: number | string
  latest_question_at: string | Date | null
}
```

- [ ] **Step 4: Implement the aggregate repository query**

Import the new row type and add `listProjectOverviews()` to the repository. Map `COUNT` through `Number` for PostgreSQL compatibility and normalize dates with the existing `iso` helper:

```ts
async listProjectOverviews(): Promise<InterviewProjectOverviewDto[]> {
  const rows = await db.query<InterviewProjectOverviewRow>(
    `SELECT
       jobs.id AS job_post_id,
       jobs.company_name,
       jobs.job_title,
       COUNT(questions.id) AS question_count,
       MAX(questions.created_at) AS latest_question_at
     FROM job_search_job_posts jobs
     LEFT JOIN interview_prep_questions questions ON questions.job_post_id = jobs.id
     GROUP BY jobs.id, jobs.company_name, jobs.job_title, jobs.created_at
     ORDER BY
       CASE WHEN MAX(questions.created_at) IS NULL THEN 1 ELSE 0 END,
       MAX(questions.created_at) DESC,
       jobs.created_at DESC`,
  )
  return rows.map((row) => ({
    jobPostId: row.job_post_id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    questionCount: Number(row.question_count),
    latestQuestionAt: row.latest_question_at === null ? null : iso(row.latest_question_at),
  }))
}
```

- [ ] **Step 5: Expose the service, controller, and route**

Add `listProjectOverviews()` to the service and controller, and register the static route before parameterized project routes:

```ts
// service
async listProjectOverviews(): Promise<InterviewProjectOverviewDto[]> {
  return interviewPrepRepository.listProjectOverviews()
}

// controller
async listProjectOverviews(_req: FastifyRequest, reply: FastifyReply) {
  const data = await interviewPrepService.listProjectOverviews()
  return reply.send(success(data))
}

// routes
app.get('/projects', interviewPrepController.listProjectOverviews)
```

- [ ] **Step 6: Run backend verification and confirm GREEN**

Run:

```bash
cd backend
npx tsx --test src/modules/interview-prep/interview-prep.repository.test.ts
npm run type-check
npm run lint
```

Expected: one backend test passes; type-check and lint exit 0.

- [ ] **Step 7: Commit the backend contract**

```bash
git add backend/src/modules/interview-prep
git commit -m "feat: add interview project overview API"
```

---

### Task 2: Frontend interview-review data layer

**Files:**
- Create: `frontend/src/modules/interview-prep/store/review.test.ts`
- Modify: `frontend/src/modules/interview-prep/types/index.ts`
- Modify: `frontend/src/modules/interview-prep/api/index.ts`
- Modify: `frontend/src/modules/interview-prep/store/index.ts`

**Interfaces:**
- Consumes: `GET /interview-prep/projects`, existing question list/create endpoints.
- Produces: `InterviewProjectOverview`, `projects`, `reviewQuestions`, `reviewLoading`, `reviewError`, `loadReviewProjects`, `loadReviewQuestions`, and `createReviewQuestion`.

- [ ] **Step 1: Write failing store tests**

Mock `interviewPrepApi`, create a fresh Pinia for each test, and assert loading plus state updates:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { interviewPrepApi } from '../api'
import { useInterviewPrepStore } from './index'

vi.mock('../api', () => ({
  interviewPrepApi: {
    listProjects: vi.fn(),
    listQuestions: vi.fn(),
    createQuestion: vi.fn(),
  },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('interview review store', () => {
  it('loads project overviews and questions independently', async () => {
    vi.mocked(interviewPrepApi.listProjects).mockResolvedValue([
      { jobPostId: 'job-1', companyName: '星海', jobTitle: '前端', questionCount: 1, latestQuestionAt: null },
    ])
    vi.mocked(interviewPrepApi.listQuestions).mockResolvedValue([])
    const store = useInterviewPrepStore()

    await Promise.all([store.loadReviewProjects(), store.loadReviewQuestions('job-1')])

    expect(store.projects).toHaveLength(1)
    expect(store.reviewQuestions).toEqual([])
    expect(store.reviewError).toBeNull()
  })

  it('prepends a saved question without changing the existing preparation summary', async () => {
    const question = {
      id: 'question-1', jobPostId: 'job-1', roundLabel: '初面' as const, customRound: null,
      questionText: 'Vue 响应式原理？', userAnswer: null, notes: null,
      createdAt: '2026-08-16T12:00:00.000Z', updatedAt: '2026-08-16T12:00:00.000Z',
    }
    vi.mocked(interviewPrepApi.createQuestion).mockResolvedValue(question)
    const store = useInterviewPrepStore()

    await store.createReviewQuestion('job-1', {
      roundLabel: '初面', customRound: null, questionText: question.questionText,
    })

    expect(store.reviewQuestions).toEqual([question])
    expect(store.summary).toBeNull()
  })
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
cd frontend
npm test -- src/modules/interview-prep/store/review.test.ts
```

Expected: FAIL because the API methods and review state do not exist.

- [ ] **Step 3: Add frontend types and API methods**

Add:

```ts
export interface InterviewProjectOverview {
  jobPostId: string
  companyName: string
  jobTitle: string
  questionCount: number
  latestQuestionAt: string | null
}
```

Import it in `api/index.ts` and expose:

```ts
listProjects: () => http.get<InterviewProjectOverview[]>('/interview-prep/projects'),
listQuestions: (jobPostId: string) =>
  http.get<InterviewQuestion[]>(`/interview-prep/projects/${jobPostId}/questions`),
```

- [ ] **Step 4: Add isolated review state to the existing store**

Add refs and a dedicated runner so simultaneous overview/question requests do not interfere with legacy `loading`:

```ts
const projects = ref<InterviewProjectOverview[]>([])
const reviewQuestions = ref<InterviewQuestion[]>([])
const reviewLoading = ref(false)
const reviewError = ref<string | null>(null)
let pendingReviewRequests = 0

async function runReview<T>(work: () => Promise<T>): Promise<T> {
  pendingReviewRequests += 1
  reviewLoading.value = true
  if (pendingReviewRequests === 1) reviewError.value = null
  try {
    return await work()
  } catch (error) {
    reviewError.value = (error as Error).message
    throw error
  } finally {
    pendingReviewRequests -= 1
    reviewLoading.value = pendingReviewRequests > 0
  }
}

async function loadReviewProjects() {
  projects.value = await runReview(() => interviewPrepApi.listProjects())
}

async function loadReviewQuestions(jobPostId: string) {
  reviewQuestions.value = await runReview(() => interviewPrepApi.listQuestions(jobPostId))
}

async function createReviewQuestion(jobPostId: string, input: InterviewQuestionCreateInput) {
  const question = await runReview(() => interviewPrepApi.createQuestion(jobPostId, input))
  reviewQuestions.value = [question, ...reviewQuestions.value]
  return question
}
```

Return all new state and methods from the store. Do not alter the existing `load`, `bindResume`, or `createQuestion` semantics.

- [ ] **Step 5: Run focused tests and type-check**

```bash
cd frontend
npm test -- src/modules/interview-prep/store/review.test.ts
npm run type-check
```

Expected: two tests pass; type-check exits 0.

- [ ] **Step 6: Commit the frontend data layer**

```bash
git add frontend/src/modules/interview-prep/api frontend/src/modules/interview-prep/store frontend/src/modules/interview-prep/types
git commit -m "feat: add interview review data layer"
```

---

### Task 3: Interview project overview page

**Files:**
- Create: `frontend/src/modules/interview-prep/views/InterviewOverviewView.vue`
- Create: `frontend/src/modules/interview-prep/views/InterviewOverviewView.test.ts`

**Interfaces:**
- Consumes: `useInterviewPrepStore().projects`, `loadReviewProjects()`, route name `interview-question-review` from Task 5.
- Produces: the `/interviews` visual surface with job cards and empty state.

- [ ] **Step 1: Write failing overview-view tests**

Use a hoisted store mock and router stubs. Cover populated and empty states:

```ts
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewOverviewView from './InterviewOverviewView.vue'

const store = vi.hoisted(() => ({
  projects: [] as Array<Record<string, unknown>>,
  reviewLoading: false,
  reviewError: null as string | null,
  loadReviewProjects: vi.fn(),
}))

vi.mock('../store', () => ({ useInterviewPrepStore: () => store }))

describe('InterviewOverviewView', () => {
  beforeEach(() => {
    store.projects = []
    store.reviewError = null
    store.loadReviewProjects.mockReset().mockResolvedValue(undefined)
  })

  it('renders every job with its question count and detail link', async () => {
    store.projects = [{
      jobPostId: 'job-1', companyName: '星海科技', jobTitle: '前端工程师',
      questionCount: 3, latestQuestionAt: '2026-08-16T12:00:00.000Z',
    }]
    const wrapper = mount(InterviewOverviewView, {
      global: { stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('星海科技')
    expect(wrapper.text()).toContain('前端工程师')
    expect(wrapper.text()).toContain('3 个问题')
  })

  it('guides an empty workspace to add a job', async () => {
    const wrapper = mount(InterviewOverviewView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('还没有岗位')
    expect(wrapper.text()).toContain('先添加岗位')
  })
})
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
cd frontend
npm test -- src/modules/interview-prep/views/InterviewOverviewView.test.ts
```

Expected: FAIL because `InterviewOverviewView.vue` does not exist.

- [ ] **Step 3: Implement the overview page**

Create the page with:

- `onMounted(() => store.loadReviewProjects())`;
- header copy “面试复盘” and “按岗位记录真实面试问题。”;
- loading, error, empty, and populated states;
- semantic `<article>` cards;
- `RouterLink` to `{ name: 'interview-question-review', params: { jobPostId } }`;
- count copy `${questionCount} 个问题`;
- `Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' })` for non-null latest timestamps;
- one-column cards below 760px and two-column cards on desktop.

Use existing Less tokens (`@color-bg-elevated`, `@color-border`, `@color-text-secondary`, spacing and radius tokens). Do not introduce a new design system or external UI dependency.

- [ ] **Step 4: Run tests and type-check**

```bash
cd frontend
npm test -- src/modules/interview-prep/views/InterviewOverviewView.test.ts
npm run type-check
```

Expected: tests and type-check pass.

- [ ] **Step 5: Commit the overview page**

```bash
git add frontend/src/modules/interview-prep/views/InterviewOverviewView.vue frontend/src/modules/interview-prep/views/InterviewOverviewView.test.ts
git commit -m "feat: add interview overview page"
```

---

### Task 4: Focused interview-question recording page

**Files:**
- Create: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.vue`
- Create: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts`

**Interfaces:**
- Consumes: Task 2 review store state and methods; route param `jobPostId`.
- Produces: the focused question form and newest-first question history used by `/interviews/:jobPostId`.

- [ ] **Step 1: Write failing detail-view tests**

Mock `useRoute` with `jobPostId: 'job-1'`, mock the review store, and test the exact payload and error preservation:

```ts
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewQuestionReviewView from './InterviewQuestionReviewView.vue'

const store = vi.hoisted(() => ({
  projects: [{ jobPostId: 'job-1', companyName: '星海科技', jobTitle: '前端工程师', questionCount: 0, latestQuestionAt: null }],
  reviewQuestions: [] as Array<Record<string, unknown>>,
  reviewLoading: false,
  reviewError: null as string | null,
  loadReviewProjects: vi.fn(),
  loadReviewQuestions: vi.fn(),
  createReviewQuestion: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { jobPostId: 'job-1' } }),
}))
vi.mock('../store', () => ({ useInterviewPrepStore: () => store }))

describe('InterviewQuestionReviewView', () => {
  beforeEach(() => {
    store.reviewQuestions = []
    store.reviewError = null
    store.loadReviewProjects.mockReset().mockResolvedValue(undefined)
    store.loadReviewQuestions.mockReset().mockResolvedValue(undefined)
    store.createReviewQuestion.mockReset().mockResolvedValue(undefined)
  })

  it('saves round and trimmed question text, then clears only the question', async () => {
    const wrapper = mount(InterviewQuestionReviewView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, BaseButton: false, BaseInput: false } },
    })
    await flushPromises()
    await wrapper.get('select').setValue('复面')
    await wrapper.get('textarea').setValue('  如何优化首屏性能？  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.createReviewQuestion).toHaveBeenCalledWith('job-1', {
      roundLabel: '复面', customRound: null, questionText: '如何优化首屏性能？',
    })
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('keeps the question text when saving fails', async () => {
    store.createReviewQuestion.mockRejectedValueOnce(new Error('保存失败'))
    const wrapper = mount(InterviewQuestionReviewView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, BaseButton: false, BaseInput: false } },
    })
    await flushPromises()
    await wrapper.get('textarea').setValue('系统设计题')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('系统设计题')
    expect(wrapper.text()).toContain('保存失败')
  })
})
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
cd frontend
npm test -- src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts
```

Expected: FAIL because the view does not exist.

- [ ] **Step 3: Implement the detail page**

On mount, call `Promise.all([store.loadReviewProjects(), store.loadReviewQuestions(jobPostId)])`. Derive the current project from `store.projects`. Render:

- a `RouterLink` back to `{ name: 'interview-overview' }`;
- company and job title;
- a real `<form @submit.prevent="saveQuestion">`;
- round `<select>` with all existing `RoundLabel` values;
- `BaseInput` for custom round only when round is `其他`;
- required question `<textarea>`;
- submit button labeled “保存问题”;
- visible local `saveError` for a failed save;
- empty history copy “还没有记录面试问题”;
- newest-first cards showing the resolved round label, question text, and formatted creation time.

The save function must trim text, return without a request for empty content, set and clear a local `saving` flag in `try/finally`, clear only `questionText` after success, and preserve all form values on failure.

- [ ] **Step 4: Run tests and type-check**

```bash
cd frontend
npm test -- src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts
npm run type-check
```

Expected: focused tests and type-check pass.

- [ ] **Step 5: Commit the question page**

```bash
git add frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.vue frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts
git commit -m "feat: add interview question review page"
```

---

### Task 5: Routes and top navigation

**Files:**
- Modify: `frontend/src/modules/interview-prep/routes.ts`
- Create: `frontend/src/modules/interview-prep/routes.test.ts`
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Modify: `frontend/src/layouts/DefaultLayout.test.ts`

**Interfaces:**
- Consumes: overview and detail views from Tasks 3 and 4.
- Produces: user-visible “面试” navigation and registered route names.

- [ ] **Step 1: Write failing route and navigation tests**

In `routes.test.ts`, assert exact route names and lazy components:

```ts
import { describe, expect, it } from 'vitest'
import { interviewPrepRoutes } from './routes'

describe('interview review routes', () => {
  it('registers overview and question-review pages', () => {
    expect(interviewPrepRoutes).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'interviews', name: 'interview-overview' }),
      expect.objectContaining({ path: 'interviews/:jobPostId', name: 'interview-question-review' }),
    ]))
  })
})
```

Extend the normal-route assertion in `DefaultLayout.test.ts`:

```ts
expect(wrapper.get('.layout__header').text()).toContain('面试')
expect(wrapper.get('a[href="/interviews"]').exists()).toBe(true)
```

Ensure the memory router fixture includes an `/interviews` route so Vue Router does not warn for the new link.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
cd frontend
npm test -- src/modules/interview-prep/routes.test.ts src/layouts/DefaultLayout.test.ts
```

Expected: FAIL because the routes and navigation link are absent.

- [ ] **Step 3: Register the new lazy routes**

Prepend these records while preserving the existing preparation route:

```ts
{
  path: 'interviews',
  name: 'interview-overview',
  component: () => import('./views/InterviewOverviewView.vue'),
},
{
  path: 'interviews/:jobPostId',
  name: 'interview-question-review',
  component: () => import('./views/InterviewQuestionReviewView.vue'),
},
```

- [ ] **Step 4: Add the top navigation entry**

Add this link after “状态”:

```vue
<RouterLink to="/interviews" active-class="is-active">面试</RouterLink>
```

Do not change immersive-mode header suppression.

- [ ] **Step 5: Run route, layout, and all frontend tests**

```bash
cd frontend
npm test -- src/modules/interview-prep/routes.test.ts src/layouts/DefaultLayout.test.ts
npm test
npm run type-check
npm run lint
```

Expected: all frontend tests pass with no ESLint or TypeScript errors.

- [ ] **Step 6: Commit navigation integration**

```bash
git add frontend/src/modules/interview-prep/routes.ts frontend/src/modules/interview-prep/routes.test.ts frontend/src/layouts/DefaultLayout.vue frontend/src/layouts/DefaultLayout.test.ts
git commit -m "feat: add interview workspace entry"
```

---

### Task 6: Full verification and local desktop acceptance

**Files:**
- Modify only files identified by formatting, detector, test, or browser findings.
- Do not add product scope during this task.

**Interfaces:**
- Consumes: all completed backend and frontend work.
- Produces: a green repository gate and a live local preview ready for user acceptance.

- [ ] **Step 1: Format only changed implementation and test files**

Run Prettier with explicit paths rather than formatting unrelated files:

```bash
cd frontend
npx prettier --write \
  src/modules/interview-prep/types/index.ts \
  src/modules/interview-prep/api/index.ts \
  src/modules/interview-prep/store/index.ts \
  src/modules/interview-prep/store/review.test.ts \
  src/modules/interview-prep/routes.ts \
  src/modules/interview-prep/routes.test.ts \
  src/modules/interview-prep/views/InterviewOverviewView.vue \
  src/modules/interview-prep/views/InterviewOverviewView.test.ts \
  src/modules/interview-prep/views/InterviewQuestionReviewView.vue \
  src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts \
  src/layouts/DefaultLayout.vue \
  src/layouts/DefaultLayout.test.ts

cd ../backend
npx prettier --write \
  src/modules/interview-prep/interview-prep.schema.ts \
  src/modules/interview-prep/interview-prep.types.ts \
  src/modules/interview-prep/interview-prep.repository.ts \
  src/modules/interview-prep/interview-prep.repository.test.ts \
  src/modules/interview-prep/interview-prep.service.ts \
  src/modules/interview-prep/interview-prep.controller.ts \
  src/modules/interview-prep/interview-prep.routes.ts
```

- [ ] **Step 2: Run fresh mechanical verification**

```bash
cd backend
npx tsx --test src/modules/interview-prep/interview-prep.repository.test.ts
npm run build

cd ../frontend
npm test
npm run build
node '/Users/zhangxinrui/.agents/skills/impeccable/scripts/detect.mjs' --json \
  src/modules/interview-prep/views/InterviewOverviewView.vue \
  src/modules/interview-prep/views/InterviewQuestionReviewView.vue \
  src/layouts/DefaultLayout.vue

cd ..
bash .agents/skills/vibecoding-verify/scripts/verify.sh
git diff --check
```

Expected: backend integration test passes, all frontend tests pass, both production builds exit 0, the detector returns `[]`, and the architecture gate ends with `verify: ALL PASSED`.

- [ ] **Step 3: Start or reuse the local backend and frontend servers**

From separate terminals:

```bash
cd backend && npm run dev
cd frontend && npm run dev -- --host 127.0.0.1
```

Expected URLs: backend `http://127.0.0.1:3000`, frontend `http://127.0.0.1:5173`.

- [ ] **Step 4: Run the real-browser acceptance flow**

At desktop width:

1. Open `http://127.0.0.1:5173/job-search/jobs` and confirm the header contains “面试”.
2. Click “面试” and confirm `/interviews` shows every existing job with the correct question count.
3. Open one job card and confirm the page contains no answer-analysis, resume, introduction, FAQ, rating, or outcome controls.
4. Save one unique question with round “初面”.
5. Confirm it appears first without a reload.
6. Reload the page and confirm the question persists.
7. Return to `/interviews` and confirm that job’s count and latest timestamp update.
8. Confirm browser console contains no new warnings or errors.

- [ ] **Step 5: Fix only verified findings and repeat the affected checks**

For any failure, capture the exact symptom, add or update the smallest regression test, make the minimal fix, rerun the focused test, then rerun Step 2. Do not broaden scope.

- [ ] **Step 6: Commit final mechanical or browser fixes**

If formatting or fixes changed files:

```bash
git add backend/src/modules/interview-prep frontend/src/modules/interview-prep frontend/src/layouts/DefaultLayout.vue frontend/src/layouts/DefaultLayout.test.ts
git commit -m "fix: polish interview question review flow"
```

- [ ] **Step 7: Present the updated preview for acceptance**

Report the local URL, branch name, test totals, build results, `verify: ALL PASSED`, and the exact browser flow checked. Keep the branch isolated until the user chooses to adopt it.

## Completion Checklist

- [ ] The “面试” link is present only in the non-immersive workspace header.
- [ ] `/interviews` includes every job, including jobs with zero questions.
- [ ] Aggregate counts and latest timestamps are correct in SQLite and type-safe for PostgreSQL.
- [ ] `/interviews/:jobPostId` records only round and question content.
- [ ] Save failure preserves user input.
- [ ] Existing interview preparation behavior remains unchanged.
- [ ] No database migration was added.
- [ ] Backend test, frontend test suite, builds, lint, type-check, architecture gate, and browser acceptance all pass.
