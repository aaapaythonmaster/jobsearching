# Trae 三栏求职工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将桌面端求职工作台改造成左侧导航、中间主工作区、右侧上下文面板的 Trae 风格三栏工具界面。

**Architecture:** 保留现有 Vue Router、Pinia store、模块 API 和业务数据。`DefaultLayout.vue` 负责三栏壳层和路由上下文；新增一个共享的 `WorkspaceContextPanel.vue` 负责右侧面板通用结构，具体模块内容由页面通过 slot 提供。岗位、简历、面试、分析和状态视图只负责自己的主工作区与选中项，不跨模块调用 store。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Pinia、Less、Vitest、Vue Test Utils、Vite。

## Global Constraints

- 工作台仅面向桌面端优化，优先覆盖 1024px、1280px、1440px。
- 页面背景为浅灰，面板为白色，正文为黑色/深灰色。
- 工作台字体使用 `Inter, "PingFang SC", sans-serif`，功能文字基准 13px。
- 重要按钮使用 `#32F08C` 背景、`#0A0B0D` 文字、`0 12px` 水平内边距，目标尺寸约 96×32px。
- 首页 Ripple Distortion、自然背景和首页文案不改动。
- 不修改后端 API、数据库、Pinia store 公共方法和现有路由路径。
- 右侧面板只显示当前工作区上下文；没有选中项时显示统一空状态。
- 所有交互控件必须有可读名称、键盘焦点、hover/active/disabled 状态，并支持减少动效。
- 先写失败测试，再实现最小改动；最终运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`。

## File Structure

- Modify: `frontend/src/styles/variables.less` — Trae 中性灰、黑色和绿色 token。
- Modify: `frontend/src/styles/reset.less` — Inter/PingFang 字体栈、13px 基准和焦点规则。
- Modify: `frontend/src/styles/mixins.less` — 三栏面板、主按钮、次级按钮和上下文标题 mixin。
- Modify: `frontend/src/components/BaseButton/style.less` — 主按钮绿底黑字及完整交互状态。
- Create: `frontend/src/components/WorkspaceContextPanel.vue` — 右侧面板通用结构和空状态。
- Create: `frontend/src/components/WorkspaceContextPanel.test.ts` — 右侧面板空状态、标题和操作插槽测试。
- Modify: `frontend/src/layouts/DefaultLayout.vue` — 三栏网格、左侧导航和右侧上下文插槽。
- Modify: `frontend/src/layouts/DefaultLayout.test.ts` — 三栏区域、路由上下文和键盘语义测试。
- Modify: `frontend/src/modules/job-search/views/JobListView.vue` — 岗位主区选中项和右侧详情内容。
- Modify: `frontend/src/modules/job-search/views/ResumeListView.vue` — 简历主区选中项和右侧预览内容。
- Modify: `frontend/src/modules/job-search/views/RequirementAnalysisView.vue` — 右侧分析摘要、风险和建议。
- Modify: `frontend/src/modules/job-search/views/StatusListView.vue` — 右侧阶段说明和岗位数量。
- Modify: `frontend/src/modules/interview-prep/views/InterviewOverviewView.vue` — 右侧面试进度摘要。
- Modify: `frontend/src/modules/interview-prep/views/InterviewPrepView.vue` — 右侧面试准备上下文。
- Modify: `frontend/src/modules/interview-prep/views/InterviewQuestionReviewView.vue` — 右侧待复习问题摘要。
- Modify: corresponding view tests — assert right-panel content changes by route and selected data.

## Task 1: Establish Trae visual tokens and button states

**Files:** variables.less, reset.less, mixins.less, BaseButton/style.less, style tests.

- [ ] Write failing tests for `#32F08C` primary background, `#0A0B0D` text, 13px font and keyboard focus.
- [ ] Run the targeted style/button tests and confirm failure.
- [ ] Implement the Trae tokens and button states without removing semantic danger/success variants.
- [ ] Run `npm test -- --run src/styles/light-glass.test.ts src/components/BaseButton` plus type-check and lint.
- [ ] Commit: `style: define trae workspace tokens and buttons`.

## Task 2: Build the shared right context panel

**Files:** WorkspaceContextPanel.vue, WorkspaceContextPanel.test.ts.

- [ ] Write a failing test asserting the panel title, empty-state copy and named `primary`/`secondary` slots.
- [ ] Run the test and confirm the component is missing.
- [ ] Implement a presentational component with props `title?: string`, `subtitle?: string`, `empty?: boolean`; slots `default`, `primary`, `secondary`; and `aria-label="上下文面板"`.
- [ ] Keep the empty state exactly: `选择一项内容` / `这里会显示详细信息和快捷操作`.
- [ ] Run the component test and commit: `feat: add workspace context panel`.

## Task 3: Convert DefaultLayout to the three-column shell

**Files:** DefaultLayout.vue, DefaultLayout.test.ts.

- [ ] Add failing tests for `.layout__sidebar`, `.layout__main-column`, `.layout__context-column` and route-aware context title.
- [ ] Run the layout tests and confirm failure.
- [ ] Change the workspace grid to approximately `220px minmax(0, 1fr) 340px`; preserve the existing landing scroll behavior and route links.
- [ ] Move the current context header into the middle column; render `WorkspaceContextPanel` in the right column.
- [ ] Keep right column visible at 1024px by narrowing it before any collapse behavior; do not remove it on desktop.
- [ ] Run layout tests and `npm run build`; commit: `feat: add trae three-column workspace shell`.

## Task 4: Add route-specific right-panel content

**Files:** job-search and interview-prep views listed in File Structure, plus their tests.

- [ ] Add failing assertions for route-specific panel labels: `岗位详情`, `简历预览`, `面试进度`, `分析建议`, `求职阶段说明`.
- [ ] Run targeted view tests and confirm failure.
- [ ] In `JobListView.vue`, track the selected job id locally and provide company, title, status and next-action content to the right panel; keep list filtering and API calls unchanged.
- [ ] In `ResumeListView.vue`, track the selected resume locally and provide target role, source file, updated time and edit action; keep upload/edit API calls unchanged.
- [ ] In analysis/status/interview views, provide read-only summaries from already loaded state; use the shared empty panel when no item is selected.
- [ ] Use green buttons only for primary operations; use bordered white buttons for secondary operations.
- [ ] Run all affected view tests and commit: `feat: add contextual panels to job workspaces`.

## Task 5: Desktop QA and release

- [ ] Run `npm test` and confirm all tests pass.
- [ ] Run `npm run build` and inspect `/job-search/jobs`, `/job-search/resumes`, `/job-search/analysis`, `/job-search/statuses`, `/interviews` at 1024px, 1280px and 1440px.
- [ ] Verify the three columns, black typography, green primary buttons, right-panel empty state, keyboard focus and reduced-motion behavior.
- [ ] Run `bash .agents/skills/vibecoding-verify/scripts/verify.sh` and require `verify: ALL PASSED`.
- [ ] Commit final adjustments: `style: complete trae three-column workspace`.
- [ ] Push `main`, wait for Vercel success, and check both `/` and `/job-search/resumes` on the production domain.

## Plan Self-Review

- The plan covers the approved left navigation, middle work area, route-specific right context panel, green/black button styling and typography reference.
- It does not alter API, database, store contracts, homepage Ripple visuals or business behavior.
- Every task has a failing-test step, implementation boundary, verification command and commit boundary.
- No unresolved placeholders or undefined public interfaces remain.
