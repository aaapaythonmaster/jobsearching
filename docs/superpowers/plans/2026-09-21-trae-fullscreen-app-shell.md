# Trae 风格全屏三栏工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将功能页重构为占满视口的 Trae 风格左中右三栏工作台，首页与工作台彻底分离。

**Architecture:** `DefaultLayout.vue` 按路由二选一渲染首页或全屏工作台。工作台只负责壳层、导航和上下文标题；业务视图继续通过现有路由、store 和 API 工作，右侧上下文面板保持共享展示组件。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Less、Vitest、Vue Test Utils、Vite。

## Global Constraints

- 功能路由不渲染首页，不依赖滚动进入工作区。
- 三栏使用 `220px minmax(0, 1fr) 360px`，高度为 `100dvh`，各栏独立滚动。
- 保持 `#32F08C` 主按钮、`#0A0B0D` 文字和 13px 工作台基准字体。
- 不修改 API、数据库、Pinia store、路由路径和首页视觉效果。
- 先写失败测试，再写实现；最终必须运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`。

## Task 1: 先锁定路由分离和全屏壳层契约

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.test.ts`
- Modify: `frontend/src/layouts/DefaultLayout.vue`

- [ ] 写失败测试：根路由存在 `.layout__landing` 且不显示 `.layout__workspace`；功能路由不显示 `.layout__landing`，工作台有三列和 `100dvh` 壳层标记。
- [ ] 运行 `cd frontend && npm test -- src/layouts/DefaultLayout.test.ts`，确认断言因当前“首页+工作区同时渲染”而失败。
- [ ] 删除基于 `scrollIntoView` 的进入/返回逻辑，使用 `route.path === '/'` 作为渲染分支；品牌链接从功能页返回 `/`。
- [ ] 把工作台外层改为固定视口 Grid，移除 `width:min(...)`、外层 margin、外层圆角和 landing 上方占位。
- [ ] 运行布局测试，确认根路由与深链路由行为通过。
- [ ] 提交 `feat: split landing from fullscreen workspace`。

## Task 2: 重做三栏导航、工具栏和右栏结构

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Modify: `frontend/src/components/WorkspaceContextPanel.vue`
- Modify: `frontend/src/components/WorkspaceContextPanel.test.ts`

- [ ] 写失败测试：左栏存在新建按钮和五个主模块链接；中栏与右栏存在紧凑工具栏；右栏空状态保留两句固定文案。
- [ ] 运行布局与组件测试，确认新结构断言失败。
- [ ] 实现左栏紧凑 brand/header/nav/footer；当前项使用浅绿背景、黑字和绿色侧标。
- [ ] 实现中栏顶栏和路由标题；保持 `<RouterView />` 为中栏唯一业务入口。
- [ ] 将 `WorkspaceContextPanel` 改为全高、无外层大圆角卡片，保留标题、默认内容和 action slots；右栏内部允许轻量模块内容块。
- [ ] 运行目标测试并提交 `feat: add fullscreen trae workspace chrome`。

## Task 3: 适配全屏滚动与桌面断点

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Modify: `frontend/src/components/WorkspaceContextPanel.vue`
- Modify: `frontend/src/styles/variables.less`

- [ ] 写失败测试：壳层拥有 `100dvh`、三列独立 overflow 语义，1024px 仍保留右栏。
- [ ] 运行测试确认失败。
- [ ] 添加 `min-width: 0`、`overflow: auto`、`overscroll-behavior: contain` 和 1024px 的列宽调整；不新增依赖。
- [ ] 保持按钮、焦点和 reduced-motion token 不变；仅补充全屏壳层所需 token。
- [ ] 运行 `npm test -- src/layouts src/components/WorkspaceContextPanel.test.ts` 和 `npm run build`。
- [ ] 提交 `style: tune fullscreen workspace dimensions`。

## Task 4: 保持各工作区上下文差异

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Test: `frontend/src/layouts/DefaultLayout.test.ts`

- [ ] 写失败断言：岗位、简历、分析、状态、面试路由分别显示 `岗位详情`、`简历预览`、`分析建议`、`求职阶段说明`、`面试进度`。
- [ ] 运行布局测试确认当前 route-aware 标题缺失或不完整。
- [ ] 在右栏按 route 保留不同标题和简短说明，未选中项显示统一空状态；不触碰业务请求。
- [ ] 运行布局测试和全量测试，确认功能页面内容仍挂载在中栏。
- [ ] 提交 `feat: preserve route-aware context panels`。

## Task 5: 验证与交付

- [ ] 运行 `cd frontend && npm test`。
- [ ] 运行 `cd frontend && npm run build`。
- [ ] 运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`，确认 `verify: ALL PASSED`。
- [ ] 用本地预览检查 `/`, `/job-search/jobs`, `/job-search/resumes`, `/job-search/analysis`, `/job-search/statuses`, `/interviews`，确认无首页叠层、三栏满屏和黑字绿按钮。
- [ ] 查看 git diff，只提交本次布局改造文件；保留 `awesome-design-md/` 和根目录未跟踪 `package-lock.json` 不变。
- [ ] 提交 `style: complete fullscreen trae workspace`。

