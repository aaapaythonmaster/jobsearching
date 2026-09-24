# 岗位右栏操作面板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将岗位查看、HR 打招呼和简历调整全部收拢到右侧上下文栏，中间区域保持岗位列表。

**Architecture:** 在现有 Vue 工作台壳层增加岗位上下文状态，通过 Pinia job-search store 保存当前右栏岗位和模式；JobListView 只负责触发状态，DefaultLayout 负责右栏展示。复用现有 job-search API，不修改后端契约。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vue Router、Less、Vitest。

## Global Constraints

- 前端模块只能通过 `modules/job-search/api` 或 store 调用 API。
- 不在视图中直接调用 `fetch`。
- 不删除旧岗位详情路由。
- 右栏操作必须保持当前 URL 和中间岗位列表不变。

### Task 1: Add right-panel state to job-search store

**Files:**
- Modify: `frontend/src/modules/job-search/store/index.ts`
- Modify: `frontend/src/modules/job-search/types/index.ts`
- Test: `frontend/src/modules/job-search/store/index.test.ts`

- [ ] Write failing tests for selecting a job, changing panel mode, and clearing context.
- [ ] Run the store test and verify it fails because the context state is missing.
- [ ] Add `JobContextMode = 'detail' | 'greeting' | 'tailored'`, selected job ref, and actions `openJobContext`, `setJobContextMode`, `clearJobContext`.
- [ ] Run the store test and verify it passes.

### Task 2: Make the layout render job context in the right column

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Create: `frontend/src/components/JobContextPanel.vue`
- Test: `frontend/src/layouts/DefaultLayout.test.ts`

- [ ] Add failing tests for the empty state and each job context mode.
- [ ] Run the layout test and verify it fails.
- [ ] Implement the panel shell with close control and mode-specific headings; use existing API methods and store state.
- [ ] Keep the right column scrollable and keep the context action inside the right column.
- [ ] Run layout tests and verify all new assertions pass.

### Task 3: Replace list navigation with right-panel actions

**Files:**
- Modify: `frontend/src/modules/job-search/views/JobListView.vue`
- Test: `frontend/src/modules/job-search/views/JobListView.test.ts`

- [ ] Add failing tests for four action labels/order and route stability after the first three actions.
- [ ] Run the view test and verify it fails.
- [ ] Replace the router push on “查看” with store context actions; add “打招呼” and “简历调整” between “查看” and “删除”.
- [ ] Add `white-space: nowrap` and non-shrinking action styles to prevent the button labels from wrapping.
- [ ] Run the view test and verify it passes.

### Task 4: Retire the broken middle-area return affordance

**Files:**
- Modify: `frontend/src/modules/job-search/views/JobDetailView.vue`
- Modify: `frontend/src/layouts/DefaultLayout.vue`

- [ ] Add a regression assertion that the list route has no middle-area detail return control.
- [ ] Remove only the list-triggered detail navigation; leave the legacy detail route available for direct links.
- [ ] Ensure the right-panel close control returns to the empty context state without router back behavior.

### Task 5: Verify the complete frontend change

- [ ] Run the focused job-search tests.
- [ ] Run `npm run build` in `frontend`.
- [ ] Run `bash .agents/skills/vibecoding-verify/scripts/verify.sh` from the repository root.
- [ ] Open `http://127.0.0.1:5174/job-search/jobs` and verify list remains visible while each action updates only the right column.
