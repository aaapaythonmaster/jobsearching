# Batch Job Screenshot Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to select up to 10 JD screenshots, recognize at most 2 concurrently, and review and save one independently created job per screenshot.

**Architecture:** Keep the backend single-image and single-job contracts unchanged. Add a frontend-only queue composable inside the closed-loop `job-search` module, render the queue and active draft through two private components, and let `JobListView` coordinate existing API/store calls.

**Tech Stack:** Vue 3.5, TypeScript 5.6, Pinia 2.2, Less, Vite 6, Vitest, Vue Test Utils, happy-dom.

## Global Constraints

- One screenshot represents exactly one job.
- Accept at most 10 screenshots per selection and at most 8 MB per image.
- Run at most 2 OCR-plus-parse pipelines concurrently, including retries.
- Review and save jobs individually; never bulk-create or auto-save.
- Do not change backend routes, schemas, multipart limits, services, migrations, or database structure.
- Keep all new business code inside `frontend/src/modules/job-search/`.
- Preserve unrelated existing working-tree changes.

---

## File map

- `frontend/src/modules/job-search/types/index.ts`: queue status, task, and file-rejection contracts.
- `frontend/src/modules/job-search/composables/useJobImageQueue.ts`: validation, concurrency-two scheduler, state transitions, selection, retry, removal, and draft updates.
- `frontend/src/modules/job-search/composables/useJobImageQueue.test.ts`: deterministic queue tests with deferred promises.
- `frontend/src/modules/job-search/components/JobImageQueue.vue`: file picker, queue status list, retry, removal, and task selection.
- `frontend/src/modules/job-search/components/JobImageQueue.test.ts`: file-limit and emitted-action interaction tests.
- `frontend/src/modules/job-search/components/JobDraftReview.vue`: active draft form, required-field validation, skip, remove, retry, and save actions.
- `frontend/src/modules/job-search/components/JobDraftReview.test.ts`: draft edit and validation interaction tests.
- `frontend/src/modules/job-search/views/JobListView.vue`: compose the queue/review components with existing OCR, parse, store-create, filters, and job list.
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`: test dependencies, script, and happy-dom configuration.

---

### Task 1: Test harness, queue contracts, and input validation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/modules/job-search/types/index.ts`
- Create: `frontend/src/modules/job-search/composables/useJobImageQueue.ts`
- Create: `frontend/src/modules/job-search/composables/useJobImageQueue.test.ts`

**Interfaces:**
- Consumes: existing `JobPostCreateInput`, `JobPostParsed`, `JobPostImageExtracted`.
- Produces: `JobImageTaskStatus`, `JobImageTask`, `RejectedJobImage`, `createEmptyJobDraft()`, and `useJobImageQueue(options)`.

- [ ] **Step 1: Install the test harness**

Run:

```bash
cd frontend
npm install --save-dev vitest@^3.2.4 @vue/test-utils@^2.4.6 happy-dom@^18.0.1
```

Expected: `package.json` and `package-lock.json` include the three dev dependencies.

- [ ] **Step 2: Add the test script and Vite test environment**

Add to `frontend/package.json` scripts:

```json
"test": "vitest run"
```

Extend `frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
  },
})
```

- [ ] **Step 3: Define queue types**

Append to `frontend/src/modules/job-search/types/index.ts`:

```ts
export type JobImageTaskStatus =
  | 'queued'
  | 'extracting'
  | 'ready'
  | 'saving'
  | 'extract_failed'
  | 'save_failed'

export interface JobImageTask {
  id: string
  file: File
  previewUrl: string
  status: JobImageTaskStatus
  draft: JobPostCreateInput
  error: string | null
  removed: boolean
}

export interface RejectedJobImage {
  fileName: string
  reason: 'not_image' | 'too_large'
}
```

- [ ] **Step 4: Write failing validation tests**

Create `useJobImageQueue.test.ts` with explicit examples:

```ts
import { describe, expect, it, vi } from 'vitest'
import { useJobImageQueue } from './useJobImageQueue'

const image = (name: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' })

const options = () => ({
  extract: vi.fn(async () => ({ jdText: '完整 JD' })),
  parse: vi.fn(async () => ({
    companyName: '示例公司', jobTitle: '产品经理', jobDirection: 'AI 产品',
    city: null, salaryRange: null, sourcePlatform: 'Boss直聘', jobUrl: null, notes: null,
  })),
  createId: vi.fn((file: File) => `id-${file.name}`),
  createPreviewUrl: vi.fn((file: File) => `blob:${file.name}`),
  revokePreviewUrl: vi.fn(),
})

describe('useJobImageQueue input validation', () => {
  it('rejects the whole selection when more than 10 files are chosen', () => {
    const queue = useJobImageQueue(options())
    const result = queue.addFiles(Array.from({ length: 11 }, (_, i) => image(`${i}.png`)))
    expect(result).toEqual({ accepted: 0, rejected: [], selectionError: '单次最多上传 10 张截图' })
    expect(queue.tasks.value).toHaveLength(0)
  })

  it('accepts valid images and reports invalid files by name', () => {
    const queue = useJobImageQueue(options())
    const oversized = image('large.png', 8 * 1024 * 1024 + 1)
    const text = new File(['x'], 'jd.txt', { type: 'text/plain' })
    const result = queue.addFiles([image('valid.png'), oversized, text])
    expect(result.accepted).toBe(1)
    expect(result.rejected).toEqual([
      { fileName: 'large.png', reason: 'too_large' },
      { fileName: 'jd.txt', reason: 'not_image' },
    ])
  })
})
```

- [ ] **Step 5: Run tests and verify the red state**

Run: `cd frontend && npm test -- useJobImageQueue.test.ts`

Expected: FAIL because `useJobImageQueue.ts` does not exist.

- [ ] **Step 6: Implement minimal types, draft factory, and validation**

Create `useJobImageQueue.ts` with these exported signatures and validation behavior:

```ts
import { computed, ref } from 'vue'
import type { JobImageTask, JobPostCreateInput, JobPostImageExtracted, JobPostParsed, RejectedJobImage } from '../types'

const MAX_FILES = 10
const MAX_FILE_SIZE = 8 * 1024 * 1024

export interface JobImageQueueOptions {
  extract: (file: File) => Promise<JobPostImageExtracted>
  parse: (jdText: string) => Promise<JobPostParsed>
  createId?: (file: File) => string
  createPreviewUrl?: (file: File) => string
  revokePreviewUrl?: (url: string) => void
}

export function createEmptyJobDraft(): JobPostCreateInput {
  return { companyName: '', jobTitle: '', jobDirection: '', city: '', salaryRange: '', sourcePlatform: 'Boss直聘', jdText: '', statusId: '', notes: '' }
}

export function useJobImageQueue(options: JobImageQueueOptions) {
  const tasks = ref<JobImageTask[]>([])
  const selectedTaskId = ref<string | null>(null)
  const activeTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null)
  const createId = options.createId ?? (() => crypto.randomUUID())
  const createPreviewUrl = options.createPreviewUrl ?? URL.createObjectURL

  function addFiles(files: File[]) {
    if (files.length > MAX_FILES) return { accepted: 0, rejected: [], selectionError: '单次最多上传 10 张截图' }
    const rejected: RejectedJobImage[] = []
    const accepted = files.filter((file) => {
      if (!file.type.startsWith('image/')) { rejected.push({ fileName: file.name, reason: 'not_image' }); return false }
      if (file.size > MAX_FILE_SIZE) { rejected.push({ fileName: file.name, reason: 'too_large' }); return false }
      return true
    })
    tasks.value.push(...accepted.map((file) => ({
      id: createId(file),
      file,
      previewUrl: createPreviewUrl(file),
      status: 'queued' as const,
      draft: createEmptyJobDraft(),
      error: null,
      removed: false,
    })))
    return { accepted: accepted.length, rejected, selectionError: null }
  }

  return { tasks, selectedTaskId, activeTask, addFiles }
}
```

Replace the two implementation comments with direct mapping only; do not add scheduler behavior until Task 2.

- [ ] **Step 7: Run tests and commit**

Run: `cd frontend && npm test -- useJobImageQueue.test.ts`

Expected: 2 tests PASS.

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts \
  frontend/src/modules/job-search/types/index.ts \
  frontend/src/modules/job-search/composables/useJobImageQueue.ts \
  frontend/src/modules/job-search/composables/useJobImageQueue.test.ts
git commit -m "test: add job image queue validation"
```

---

### Task 2: Concurrency-two recognition scheduler

**Files:**
- Modify: `frontend/src/modules/job-search/composables/useJobImageQueue.ts`
- Modify: `frontend/src/modules/job-search/composables/useJobImageQueue.test.ts`

**Interfaces:**
- Consumes: `JobImageQueueOptions.extract(file)` and `parse(jdText)`.
- Produces: `retryTask(id)`, `removeTask(id)`, `selectTask(id)`, `selectNextReady()`, `updateDraft(id, patch)`, `markSaving(id)`, `markSaved(id)`, `markSaveFailed(id, message)`.

- [ ] **Step 1: Write failing scheduler tests**

Add deferred-promise tests proving the exact behavior:

```ts
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

it('runs at most two recognition pipelines and starts the next after a slot frees', async () => {
  const calls = [deferred<JobPostImageExtracted>(), deferred<JobPostImageExtracted>(), deferred<JobPostImageExtracted>()]
  const extract = vi.fn((_file: File) => calls[extract.mock.calls.length - 1].promise)
  const queue = useJobImageQueue({ ...options(), extract })
  queue.addFiles([image('1.png'), image('2.png'), image('3.png')])
  expect(extract).toHaveBeenCalledTimes(2)
  calls[0].resolve({ jdText: 'JD 1' })
  await vi.waitFor(() => expect(extract).toHaveBeenCalledTimes(3))
})

it('isolates failures and retries through the same scheduler', async () => {
  const extract = vi.fn().mockRejectedValueOnce(new Error('OCR failed')).mockResolvedValue({ jdText: 'JD' })
  const queue = useJobImageQueue({ ...options(), extract })
  queue.addFiles([image('bad.png'), image('good.png')])
  await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('extract_failed'))
  await vi.waitFor(() => expect(queue.tasks.value[1].status).toBe('ready'))
  queue.retryTask(queue.tasks.value[0].id)
  await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('ready'))
})

it('does not restore a task removed while recognition is in flight', async () => {
  const pending = deferred<JobPostImageExtracted>()
  const queue = useJobImageQueue({ ...options(), extract: () => pending.promise })
  queue.addFiles([image('remove.png')])
  const id = queue.tasks.value[0].id
  queue.removeTask(id)
  pending.resolve({ jdText: 'late result' })
  await Promise.resolve()
  expect(queue.tasks.value.some((task) => task.id === id)).toBe(false)
})
```

- [ ] **Step 2: Run tests and verify failures**

Run: `cd frontend && npm test -- useJobImageQueue.test.ts`

Expected: FAIL because only validation exists and recognition methods are absent.

- [ ] **Step 3: Implement the scheduler and state transitions**

Use one `activeCount` and a single `pump()` entry point:

```ts
let activeCount = 0

function pump() {
  while (activeCount < 2) {
    const task = tasks.value.find((item) => item.status === 'queued' && !item.removed)
    if (!task) return
    activeCount += 1
    task.status = 'extracting'
    void recognize(task).finally(() => { activeCount -= 1; pump() })
  }
}

async function recognize(task: JobImageTask) {
  try {
    const { jdText } = await options.extract(task.file)
    const parsed = await options.parse(jdText)
    if (task.removed) return
    task.draft = {
      ...task.draft,
      jdText,
      companyName: parsed.companyName ?? '', jobTitle: parsed.jobTitle ?? '',
      jobDirection: parsed.jobDirection ?? '', city: parsed.city ?? '',
      salaryRange: parsed.salaryRange ?? '', sourcePlatform: parsed.sourcePlatform ?? 'Boss直聘',
      jobUrl: parsed.jobUrl ?? '', notes: parsed.notes ?? '',
    }
    task.status = 'ready'
    task.error = null
    if (!selectedTaskId.value) selectedTaskId.value = task.id
  } catch (error) {
    if (task.removed) return
    task.status = 'extract_failed'
    task.error = (error as Error).message
  }
}
```

Implement all Task 2 interface methods. `removeTask` must set `removed = true`, revoke its preview URL, remove it from `tasks`, and select the next ready item when necessary. `markSaved` must revoke the URL and remove the task. `updateDraft` must merge a partial `JobPostCreateInput` without replacing unrelated edits.

At the end of the successful `addFiles` path, call `pump()` immediately before returning the result so newly accepted tasks begin processing.

- [ ] **Step 4: Run scheduler tests and commit**

Run: `cd frontend && npm test -- useJobImageQueue.test.ts`

Expected: all validation and scheduler tests PASS.

```bash
git add frontend/src/modules/job-search/composables/useJobImageQueue.ts \
  frontend/src/modules/job-search/composables/useJobImageQueue.test.ts
git commit -m "feat: schedule job screenshot recognition"
```

---

### Task 3: Queue and draft-review components

**Files:**
- Create: `frontend/src/modules/job-search/components/JobImageQueue.vue`
- Create: `frontend/src/modules/job-search/components/JobImageQueue.test.ts`
- Create: `frontend/src/modules/job-search/components/JobDraftReview.vue`
- Create: `frontend/src/modules/job-search/components/JobDraftReview.test.ts`

**Interfaces:**
- `JobImageQueue` consumes `tasks`, `selectedTaskId`, and `processing`; emits `files`, `select`, `retry`, and `remove`.
- `JobDraftReview` consumes `task` and `statuses`; emits `update:draft`, `save`, `skip`, `retry`, and `remove`.

- [ ] **Step 1: Write failing component interaction tests**

Use Vue Test Utils to assert observable behavior:

```ts
it('emits all chosen files and resets the native input', async () => {
  const wrapper = mount(JobImageQueue, { props: { tasks: [], selectedTaskId: null, processing: false } })
  const input = wrapper.get('input[type="file"]')
  const files = [image('one.png'), image('two.png')]
  Object.defineProperty(input.element, 'files', { value: files })
  await input.trigger('change')
  expect(wrapper.emitted('files')?.[0]).toEqual([files])
  expect((input.element as HTMLInputElement).value).toBe('')
})

it('blocks save and shows required fields when the active draft is incomplete', async () => {
  const wrapper = mount(JobDraftReview, { props: { task: readyTask(createEmptyJobDraft()), statuses: [] } })
  await wrapper.get('form').trigger('submit')
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(wrapper.text()).toContain('请填写公司、岗位、方向和 JD 原文')
})

it('emits an edited complete draft on save', async () => {
  const task = readyTask({ ...createEmptyJobDraft(), companyName: 'A', jobTitle: 'PM', jobDirection: 'AI', jdText: 'JD' })
  const wrapper = mount(JobDraftReview, { props: { task, statuses: [] } })
  await wrapper.get('form').trigger('submit')
  expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ companyName: 'A', jobTitle: 'PM' })
})
```

The test helper `readyTask(draft)` must return a complete `JobImageTask` with status `ready`, a PNG `File`, and a deterministic preview URL.

- [ ] **Step 2: Run component tests and verify the red state**

Run: `cd frontend && npm test -- JobImageQueue.test.ts JobDraftReview.test.ts`

Expected: FAIL because both Vue components are absent.

- [ ] **Step 3: Implement `JobImageQueue.vue`**

The file input must be exactly:

```vue
<input ref="inputRef" class="visually-hidden" type="file" accept="image/*" multiple @change="onFiles" />
```

Render every task as a real `<button type="button">` with its preview image, file name, and the Chinese label mapped from status. Render “重试” only for `extract_failed`; render “移除” for every unsaved task. Do not perform API calls in this component.

- [ ] **Step 4: Implement `JobDraftReview.vue`**

Maintain a local reactive copy keyed by `task.id`, watch task changes, and emit patches on edits. On submit use this exact guard:

```ts
const required = [draft.companyName, draft.jobTitle, draft.jobDirection, draft.jdText]
if (required.some((value) => !value.trim())) {
  validationError.value = '请填写公司、岗位、方向和 JD 原文'
  return
}
emit('save', { ...draft })
```

Disable editing and actions while status is `saving`. For `extract_failed`, show the error and only retry/remove actions. When no task is active, show an empty-state message telling the user to upload or select a screenshot.

- [ ] **Step 5: Run component tests and commit**

Run: `cd frontend && npm test -- JobImageQueue.test.ts JobDraftReview.test.ts`

Expected: all component tests PASS.

```bash
git add frontend/src/modules/job-search/components/JobImageQueue.vue \
  frontend/src/modules/job-search/components/JobImageQueue.test.ts \
  frontend/src/modules/job-search/components/JobDraftReview.vue \
  frontend/src/modules/job-search/components/JobDraftReview.test.ts
git commit -m "feat: add screenshot queue review UI"
```

---

### Task 4: Integrate queue review with the jobs page

**Files:**
- Modify: `frontend/src/modules/job-search/views/JobListView.vue`
- Create: `frontend/src/modules/job-search/views/JobListView.test.ts`

**Interfaces:**
- Consumes: `useJobImageQueue`, `jobSearchApi.extractJobImage`, `jobSearchApi.parseJob`, and `store.createJob`.
- Produces: a working batch-recognition panel that leaves the user on `/job-search/jobs` after each save.

- [ ] **Step 1: Write a failing page orchestration test**

Mock the API and store at module boundaries and verify that one reviewed task creates exactly one job without router navigation:

```ts
it('saves one reviewed task, updates the list through the store, and stays on the page', async () => {
  mockedExtract.mockResolvedValue({ jdText: '完整 JD' })
  mockedParse.mockResolvedValue(parsedJob)
  mockedCreateJob.mockResolvedValue(createdJob)
  const wrapper = mount(JobListView, { global: { plugins: [router, pinia] } })
  await wrapper.get('input[type="file"]').trigger('change')
  await vi.waitFor(() => expect(wrapper.text()).toContain('待确认'))
  await wrapper.get('[data-testid="save-job-draft"]').trigger('click')
  await vi.waitFor(() => expect(mockedCreateJob).toHaveBeenCalledTimes(1))
  expect(router.currentRoute.value.name).toBe('job-search-job-list')
})
```

Use a memory router initialized at `/job-search/jobs`; use `vi.mock('../api')` and `vi.mock('../store')` with complete methods referenced by the page.

- [ ] **Step 2: Run the integration test and verify failure**

Run: `cd frontend && npm test -- JobListView.test.ts`

Expected: FAIL because the page still uses the single-file flow and navigates to detail after save.

- [ ] **Step 3: Replace the single-file flow with queue orchestration**

Initialize the queue in `JobListView.vue`:

```ts
const queue = useJobImageQueue({
  extract: jobSearchApi.extractJobImage,
  parse: (jdText) => jobSearchApi.parseJob({ jdText }),
})

async function saveDraft(draft: JobPostCreateInput) {
  const task = queue.activeTask.value
  if (!task) return
  queue.updateDraft(task.id, draft)
  queue.markSaving(task.id)
  try {
    await store.createJob(clean(draft))
    queue.markSaved(task.id)
  } catch (error) {
    queue.markSaveFailed(task.id, (error as Error).message)
  }
}
```

Delete the old `jdImageInput`, single `form`, `extractingImage`, `parsing`, `parseMessage`, `parseError`, `createJob`, `parseJob`, `extractImageAndParse`, `chooseJdImage`, `applyParsedJob`, and `fillIfBlank` state/functions. Keep filters, list loading, status lookup, and deletion unchanged.

Render `JobImageQueue` and `JobDraftReview` in the left panel area, wire every emitted event to the queue, and display validation rejections returned by `addFiles`. Do not call `router.push` after save.

- [ ] **Step 4: Add responsive styling**

Use a two-column inner review grid on desktop and one column below 960 px:

```less
.job-create {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: @space-lg;
}

@media (max-width: 960px) {
  .job-create { grid-template-columns: 1fr; }
}
```

Keep the job list as a separate panel below the creation panel so the review editor has sufficient width.

- [ ] **Step 5: Run focused and full frontend checks**

Run:

```bash
cd frontend
npm test -- JobListView.test.ts
npm test
npm run type-check
npm run lint
npm run build
```

Expected: all tests PASS; type check, lint, and build exit 0.

- [ ] **Step 6: Commit the page integration**

```bash
git add frontend/src/modules/job-search/views/JobListView.vue \
  frontend/src/modules/job-search/views/JobListView.test.ts
git commit -m "feat: review batch job screenshots individually"
```

---

### Task 5: Architecture and browser verification

**Files:**
- Modify only files required to fix issues discovered by the checks.

**Interfaces:**
- Consumes: completed frontend queue and existing local preview scripts.
- Produces: verified batch-upload behavior with no architecture violations.

- [ ] **Step 1: Run the repository verification gate**

Run: `bash .agents/skills/vibecoding-verify/scripts/verify.sh`

Expected: exit 0 and final output `verify: ALL PASSED`.

- [ ] **Step 2: Verify the local preview manually**

Open `http://127.0.0.1:5176/job-search/jobs` and execute this exact checklist:

1. Select 3 valid screenshots and confirm no more than 2 show “识别中” simultaneously.
2. Edit the first recognized job, click “跳过”, return to it, and confirm edits persist.
3. Save each recognized job separately; confirm each appears immediately in the job list and the route stays `/job-search/jobs`.
4. Retry one failed recognition and confirm other queued tasks continue.
5. Remove one in-flight task and confirm it does not reappear when its request completes.
6. Select 11 files and confirm none enter the queue.
7. Select a non-image and an image larger than 8 MB with a valid image; confirm only the valid image enters and rejected filenames are shown.

- [ ] **Step 3: Inspect browser and server errors**

Expected: no new console errors, no unhandled promise rejections, and no 500 responses during the successful paths.

- [ ] **Step 4: Re-run the owning task after any fix**

If verification exposes a defect, return to the task that owns that file, add a regression test there, make the smallest fix, run that task's focused and full checks, and use that task's explicit staging command. If no files change, do not create an empty commit.
