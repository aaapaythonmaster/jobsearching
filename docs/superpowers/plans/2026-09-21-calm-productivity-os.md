# Calm Productivity OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将求职工作台改造成统一、安静、信息可扫描的 Calm Productivity OS，同时保留首页的沉浸式品牌入口。

**Architecture:** 不修改 Fastify、API、Pinia store 或数据模型。全局视觉规则集中在 `frontend/src/styles` 与基础组件；页面只调整现有视图的 DOM 分组、语义标签和 scoped Less。首页继续由 `HomeView.vue` 承担自然影像和 Ripple 动效，`DefaultLayout.vue` 作为功能页外壳统一导航、上下文栏和内容密度。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Pinia、Less、Vitest、Vue Test Utils、Vite。

## Global Constraints

- 不新增业务能力、不修改 API、不修改数据库结构、不引入 UI 框架或额外运行时依赖。
- 功能页仅使用系统无衬线字体；宋体只保留给首页主标题。
- 蓝绿色是唯一品牌主色；绿色只表达成功语义；警告和危险状态必须同时显示文字。
- 功能页以平面背景、细边框、留白为主；玻璃材质只允许用于侧边栏、弹窗和浮起容器。
- 保留现有路由、组件公开接口和请求路径；视图仍只能通过所属模块的 API/store 访问数据。
- 支持 `prefers-reduced-motion`，保持可见键盘焦点，正文和背景对比度不低于 4.5:1。
- 每个任务以测试先行；每项完成后运行目标测试，最终运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`。

---

## File Structure

- Modify: `frontend/src/styles/variables.less` — 统一颜色、间距、圆角、阴影 token。
- Modify: `frontend/src/styles/mixins.less` — 提供平面 surface、浮起 surface、页面标题和状态标签的可复用 Less mixin。
- Modify: `frontend/src/styles/reset.less` — 定义全局正文、焦点、减少动效和基础表单规则。
- Modify: `frontend/src/styles/light-glass.test.ts` — 由“玻璃可读性”改为“工作台可读性与 token 语义”回归测试。
- Modify: `frontend/src/layouts/DefaultLayout.vue` — 固定工作台外壳、上下文栏和紧凑导航。
- Modify: `frontend/src/layouts/DefaultLayout.test.ts` — 验证工作台导航、上下文栏与深链行为。
- Modify: `frontend/src/modules/job-search/views/JobListView.vue` — 岗位页的行动优先结构和筛选区层级。
- Modify: `frontend/src/modules/job-search/views/ResumeListView.vue` — 简历列表与编辑/预览工作区布局。
- Modify: `frontend/src/modules/job-search/views/ResumeListView.test.ts` — 验证上传入口、列表/编辑区和空状态操作语义。
- Modify: `frontend/src/modules/job-search/views/RequirementAnalysisView.vue` — 分析结果按问题、建议、已处理结构分组。
- Modify: `frontend/src/modules/job-search/views/StatusListView.vue` — 阶段状态、可读标签和管理区域层级。
- Modify: `frontend/src/modules/job-search/views/JobListView.test.ts` — 验证岗位页主操作和筛选可访问名称。
- Create: `frontend/src/modules/job-search/views/RequirementAnalysisView.test.ts` — 验证分析分区与渐进展开触发语义。
- Create: `frontend/src/modules/job-search/views/StatusListView.test.ts` — 验证状态名称、颜色辅助文本和编辑操作。
- Modify: `frontend/src/modules/interview-prep/views/InterviewOverviewView.vue` — 面试总览的近期行动、进度和项目入口。
- Modify: `frontend/src/modules/interview-prep/views/InterviewPrepView.vue` — 面试准备页的阶段导航与任务分区。
- Modify: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.vue` — 问题复盘页的时间线和新增记录区域。
- Modify: `frontend/src/modules/interview-prep/views/InterviewOverviewView.test.ts` — 验证项目卡片、空状态主操作和最近记录。
- Modify: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts` — 验证问题录入区域与回退链接。

## Task 1: Establish the Calm Productivity visual foundation

**Files:**
- Modify: `frontend/src/styles/variables.less`
- Modify: `frontend/src/styles/mixins.less`
- Modify: `frontend/src/styles/reset.less`
- Modify: `frontend/src/styles/light-glass.test.ts`

**Interfaces:**
- Consumes: existing Less tokens injected by `frontend/vite.config.ts`.
- Produces: `.workspace-surface()`, `.workspace-floating-surface()`, `.workspace-page-heading()` and `.workspace-status-chip()` mixins for scoped page styles.

- [ ] **Step 1: Write failing token/readability tests**

  Replace the current test with assertions that compile the shared variables and mixins, then check the generated CSS contains the workspace surfaces and accessible text colors.

  ```ts
  expect(css).toContain('background: #f6fafb')
  expect(css).toContain('border: 1px solid rgba(56, 93, 111, 0.14)')
  expect(contrastRatio('@color-text', '@color-bg-muted')).toBeGreaterThanOrEqual(4.5)
  expect(css).not.toContain('backdrop-filter: blur(20px)')
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `npm test -- --run src/styles/light-glass.test.ts`

  Expected: FAIL because the workspace mixins and flat surface rules do not exist.

- [ ] **Step 3: Implement the token and mixin contract**

  Keep `@color-primary` as the blue anchor; define opaque functional surfaces and reserve blur for `.workspace-floating-surface()`.

  ```less
  @color-workspace-canvas: #f6fafb;
  @color-workspace-surface: #ffffff;
  @color-workspace-subtle: #eef5f7;

  .workspace-surface() {
    background: @color-workspace-surface;
    border: 1px solid @color-border;
    border-radius: @radius-lg;
  }

  .workspace-floating-surface() {
    .workspace-surface();
    box-shadow: @shadow-sm;
    -webkit-backdrop-filter: blur(16px) saturate(120%);
    backdrop-filter: blur(16px) saturate(120%);
  }
  ```

  Apply the canvas token to `body`, retain `:focus-visible`, and ensure reduced-motion disables transitions and animations.

- [ ] **Step 4: Run the style test and global frontend checks**

  Run: `npm test -- --run src/styles/light-glass.test.ts && npm run type-check && npm run lint`

  Expected: PASS.

- [ ] **Step 5: Commit the visual foundation**

  ```bash
  git add frontend/src/styles/variables.less frontend/src/styles/mixins.less frontend/src/styles/reset.less frontend/src/styles/light-glass.test.ts
  git commit -m "style: establish calm workspace foundations"
  ```

## Task 2: Refine the persistent workspace shell

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Modify: `frontend/src/layouts/DefaultLayout.test.ts`

**Interfaces:**
- Consumes: workspace mixins from Task 1 and existing routes (`/job-search/jobs`, `/job-search/resumes`, `/job-search/analysis`, `/job-search/statuses`, `/interviews`).
- Produces: stable `.layout__sidebar`, `.layout__context`, `.layout__main` landmarks used by all page views.

- [ ] **Step 1: Extend the layout test before editing markup**

  Add a test for the visible module context and preserve the existing deep-link/scroll behavior.

  ```ts
  await router.push('/job-search/resumes')
  const wrapper = mount(DefaultLayout, { global: { plugins: [router] } })
  expect(wrapper.get('.layout__context-title').text()).toBe('简历')
  expect(wrapper.get('.layout__context').attributes('aria-label')).toBe('当前工作区：简历')
  expect(wrapper.find('.layout__sidebar').exists()).toBe(true)
  ```

- [ ] **Step 2: Run the layout test to verify it fails**

  Run: `npm test -- --run src/layouts/DefaultLayout.test.ts`

  Expected: FAIL because the context title and landmark do not exist.

- [ ] **Step 3: Implement a route-to-context mapping and flat shell**

  Add a local `computed` mapping in `DefaultLayout.vue`; do not add a store. Render a compact context bar above `<main>`, keep the sidebar sticky, and replace repeated glass styling in the content area with the flat workspace canvas.

  ```ts
  const workspaceContext = computed(() => {
    const labels: Record<string, string> = {
      '/job-search/jobs': '岗位',
      '/job-search/resumes': '简历',
      '/job-search/analysis': '分析',
      '/job-search/statuses': '状态',
      '/interviews': '面试',
    }
    return labels[route.path] ?? '求职工作台'
  })
  ```

  The context bar must use `aria-label="当前工作区：${workspaceContext}"`; only the sidebar uses `.workspace-floating-surface()`.

- [ ] **Step 4: Run layout tests and check desktop overflow**

  Run: `npm test -- --run src/layouts/DefaultLayout.test.ts && npm run build`

  Expected: PASS and a successful production build.

- [ ] **Step 5: Commit the shell change**

  ```bash
  git add frontend/src/layouts/DefaultLayout.vue frontend/src/layouts/DefaultLayout.test.ts
  git commit -m "feat: refine calm workspace shell"
  ```

## Task 3: Make job and resume pages action-first workspaces

**Files:**
- Modify: `frontend/src/modules/job-search/views/JobListView.vue`
- Modify: `frontend/src/modules/job-search/views/JobListView.test.ts`
- Modify: `frontend/src/modules/job-search/views/ResumeListView.vue`
- Modify: `frontend/src/modules/job-search/views/ResumeListView.test.ts`

**Interfaces:**
- Consumes: existing `useJobSearchStore()` methods and `jobSearchApi`; no API signatures change.
- Produces: semantic page regions named `岗位操作`, `岗位筛选`, `简历列表`, `简历编辑` for keyboard and test targeting.

- [ ] **Step 1: Add failing page-structure tests**

  Extend the job test to require a labelled main action and filters; extend the resume test to require a list region and an edit region when an item is selected.

  ```ts
  expect(wrapper.get('[aria-label="岗位操作"]').text()).toContain('新增岗位')
  expect(wrapper.get('[aria-label="岗位筛选"] input').attributes('placeholder')).toContain('搜索')
  expect(wrapper.get('[aria-label="简历列表"]').exists()).toBe(true)
  expect(wrapper.find('[aria-label="简历编辑"]').exists()).toBe(false)
  ```

- [ ] **Step 2: Run the targeted tests to verify they fail**

  Run: `npm test -- --run src/modules/job-search/views/JobListView.test.ts src/modules/job-search/views/ResumeListView.test.ts`

  Expected: FAIL because the named regions and action hierarchy do not exist.

- [ ] **Step 3: Implement the desktop information hierarchy**

  In `JobListView.vue`, place the create action in a named action area; render filters as a separate compact region; order job metadata as company/title, status, next action, then secondary details. Preserve existing upload, parsing and delete behavior.

  In `ResumeListView.vue`, keep current upload API behavior but render the collection and selected editor as a two-column workspace at desktop widths. When no resume is selected, show a detail-panel empty state that tells the user to upload or select a resume. Do not introduce a preview parser or change file storage.

  ```vue
  <section class="resume-page__workspace">
    <aside aria-label="简历列表">...</aside>
    <section aria-label="简历编辑">...</section>
  </section>
  ```

  Use `.workspace-surface()` for permanent panels; avoid blur on every job/resume item.

- [ ] **Step 4: Run targeted tests, type-check and lint**

  Run: `npm test -- --run src/modules/job-search/views/JobListView.test.ts src/modules/job-search/views/ResumeListView.test.ts && npm run type-check && npm run lint`

  Expected: PASS.

- [ ] **Step 5: Commit job and resume workspace changes**

  ```bash
  git add frontend/src/modules/job-search/views/JobListView.vue frontend/src/modules/job-search/views/JobListView.test.ts frontend/src/modules/job-search/views/ResumeListView.vue frontend/src/modules/job-search/views/ResumeListView.test.ts
  git commit -m "feat: organize job and resume workspaces"
  ```

## Task 4: Organize analysis and status around decisions

**Files:**
- Modify: `frontend/src/modules/job-search/views/RequirementAnalysisView.vue`
- Create: `frontend/src/modules/job-search/views/RequirementAnalysisView.test.ts`
- Modify: `frontend/src/modules/job-search/views/StatusListView.vue`
- Create: `frontend/src/modules/job-search/views/StatusListView.test.ts`

**Interfaces:**
- Consumes: existing `RequirementAnalysis`, `RequirementGroup` and `ApplicationStatus` types.
- Produces: display-only sections; no changes to `jobSearchApi`, store methods or status payloads.

- [ ] **Step 1: Write failing semantic grouping tests**

  Mock the existing store/API in each view test and assert the regions that make output actionable.

  ```ts
  expect(wrapper.get('[aria-label="分析建议"]').text()).toContain('建议动作')
  expect(wrapper.get('[aria-label="分析问题"]').exists()).toBe(true)
  expect(wrapper.get('[aria-label="求职阶段列表"]').exists()).toBe(true)
  expect(wrapper.get('[data-status-name="已投递"]').text()).toContain('已投递')
  ```

- [ ] **Step 2: Run the new tests to verify they fail**

  Run: `npm test -- --run src/modules/job-search/views/RequirementAnalysisView.test.ts src/modules/job-search/views/StatusListView.test.ts`

  Expected: FAIL because the named groupings and status metadata do not exist.

- [ ] **Step 3: Implement progressive analysis and readable statuses**

  Group analysis output into `发现的问题` (risks/gaps), `建议动作` (skills, experiences and tools), and `已处理项` (existing saved analysis/history). Use native `<details>` for long group content so it is progressively disclosed without new state or dependencies.

  In the status page, retain the current create/edit form. Render each status row with a text stage name, position/order and a visually swatched but text-backed status indicator; add `data-status-name` only as a stable test hook. Do not convey status through color alone.

  ```vue
  <details class="analysis-section">
    <summary>发现的问题</summary>
    <ul>...</ul>
  </details>
  ```

- [ ] **Step 4: Run targeted tests and build**

  Run: `npm test -- --run src/modules/job-search/views/RequirementAnalysisView.test.ts src/modules/job-search/views/StatusListView.test.ts && npm run build`

  Expected: PASS.

- [ ] **Step 5: Commit analysis and status changes**

  ```bash
  git add frontend/src/modules/job-search/views/RequirementAnalysisView.vue frontend/src/modules/job-search/views/RequirementAnalysisView.test.ts frontend/src/modules/job-search/views/StatusListView.vue frontend/src/modules/job-search/views/StatusListView.test.ts
  git commit -m "feat: clarify analysis and application stages"
  ```

## Task 5: Turn interview pages into a preparation timeline

**Files:**
- Modify: `frontend/src/modules/interview-prep/views/InterviewOverviewView.vue`
- Modify: `frontend/src/modules/interview-prep/views/InterviewOverviewView.test.ts`
- Modify: `frontend/src/modules/interview-prep/views/InterviewPrepView.vue`
- Modify: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.vue`
- Modify: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts`

**Interfaces:**
- Consumes: existing `useInterviewPrepStore()` project summary and review-question methods.
- Produces: route-stable overview, preparation and review regions; no changes to interview API calls or request payloads.

- [ ] **Step 1: Write failing tests for the action-first interview overview**

  Extend existing tests to require a preparation summary region and to preserve the existing empty-state route to jobs.

  ```ts
  expect(wrapper.get('[aria-label="面试准备概览"]').text()).toContain('最近记录')
  expect(wrapper.get('[aria-label="面试项目列表"]').findAll('article')).toHaveLength(1)
  expect(wrapper.get('.interview-overview__primary-link').attributes('href')).toBe('/job-search/jobs')
  ```

- [ ] **Step 2: Run interview tests to verify they fail**

  Run: `npm test -- --run src/modules/interview-prep/views/InterviewOverviewView.test.ts src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts`

  Expected: FAIL because the preparation regions are not present.

- [ ] **Step 3: Implement timeline-oriented layout without changing behavior**

  In the overview, add a compact top summary for available projects, total questions and most recent activity using data already loaded by the store. Keep each project card focused on company, role, question count, latest record and one `进入复盘` action.

  In preparation and question-review views, divide existing controls into labelled regions: `面试准备`, `记录问题`, `待复习问题`, `回答复盘`. Use a left rule/timeline treatment in CSS for chronology; do not add dates or task entities that the API does not provide.

  ```vue
  <section aria-label="记录问题" class="question-review__capture">...</section>
  <section aria-label="待复习问题" class="question-review__timeline">...</section>
  ```

- [ ] **Step 4: Run interview tests, type-check and lint**

  Run: `npm test -- --run src/modules/interview-prep/views/InterviewOverviewView.test.ts src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts && npm run type-check && npm run lint`

  Expected: PASS.

- [ ] **Step 5: Commit interview workspace changes**

  ```bash
  git add frontend/src/modules/interview-prep/views/InterviewOverviewView.vue frontend/src/modules/interview-prep/views/InterviewOverviewView.test.ts frontend/src/modules/interview-prep/views/InterviewPrepView.vue frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.vue frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.test.ts
  git commit -m "feat: structure interview preparation workspace"
  ```

## Task 6: Perform visual regression, accessibility and release verification

**Files:**
- Modify: test files from Tasks 1–5 only if a verified regression requires an assertion adjustment.
- No API, store, schema, migration or route contract changes.

**Interfaces:**
- Consumes: all completed visual changes and existing deployment configuration in `frontend/vercel.json`.
- Produces: a verified desktop build suitable for Vercel deployment.

- [ ] **Step 1: Run the complete frontend test suite**

  Run: `npm test`

  Expected: PASS for all Vue, route, request and style tests.

- [ ] **Step 2: Build and visually inspect desktop breakpoints**

  Run: `npm run build && npm run dev -- --host 127.0.0.1`

  Inspect `/job-search/jobs`, `/job-search/resumes`, `/job-search/analysis`, `/job-search/statuses`, `/interviews` at 1024px, 1280px and 1440px. Verify no horizontal overflow, the sidebar remains usable, page titles are visible, and no page uses dense glass cards.

- [ ] **Step 3: Verify reduced motion and keyboard focus**

  In browser devtools emulate `prefers-reduced-motion: reduce`; navigate with Tab through sidebar links, primary actions, filters and forms. Confirm visible focus and no essential operation relies on hover or color alone.

- [ ] **Step 4: Run repository verification**

  Run: `bash .agents/skills/vibecoding-verify/scripts/verify.sh`

  Expected: `verify: ALL PASSED`.

- [ ] **Step 5: Commit final fixes and publish**

  ```bash
  git add frontend
  git commit -m "style: complete calm productivity workspace"
  git push origin main
  ```

  Confirm Vercel reports a successful deployment for the pushed commit and check both `/` and `/job-search/resumes` on the production domain.

## Plan Self-Review

- Spec coverage: Tasks 1–2 cover global tokens, material, typography, navigation and accessibility; Tasks 3–5 cover every requested functional area; Task 6 covers desktop widths, reduced motion, keyboard use, verification and deployment.
- Scope: all tasks remain frontend-only; no API, database, route contract or business-flow change is planned.
- Type consistency: all tasks use existing Vue views, store methods and domain types; no new public function or DTO is introduced.
- Placeholder scan: no unresolved requirements, deferred implementation steps or undefined interfaces remain.
