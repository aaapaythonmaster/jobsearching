# 求职工作台待办实现计划

> **For agentic workers:** This plan is executed inline in the current session with test-first checkpoints.

**Goal:** 完成台账中求职工作台的布局、数据交互、错误处理、解析规范化、导航和颜色预设改造。

**Architecture:** 继续使用现有 `job-search` Vue 模块闭环。后端 JD/简历处理保持在 `job-search.service.ts`，前端请求只通过 `jobSearchApi`，页面状态通过 `useJobSearchStore`；`DefaultLayout` 仅负责全局导航和三栏壳层。

**Tech Stack:** Vue 3 + TypeScript + Pinia + Vue Router + Less + Fastify + zod + Vitest。

## Global Constraints

- 不在 views/components/store 中直接调用 `fetch`。
- 不跨模块直接导入业务实现。
- 后端请求/响应继续使用 zod schema 和 `{ code, data, message }`。
- 先写失败测试，再写生产代码。
- 不重置或覆盖现有未提交改动。

### Task 1: 修复分析错误展示与请求可诊断性

**Files:**
- Modify: `frontend/src/modules/job-search/views/RequirementAnalysisView.vue`
- Modify: `frontend/src/utils/request.ts`
- Test: `frontend/src/modules/job-search/views/RequirementAnalysisView.test.ts`

- [x] 写出网络失败时显示中文错误、保留重试入口的失败测试。
- [x] 运行测试确认因现有错误文案/按钮缺失而失败。
- [x] 增加统一网络错误映射，分析页区分连接失败、AI 失败和响应错误。
- [x] 运行分析页测试并确认通过。

### Task 2: 简历上传稳定性与文本规范化

**Files:**
- Modify: `frontend/src/modules/job-search/views/ResumeListView.vue`
- Modify: `backend/src/modules/job-search/job-search.document.ts`
- Modify: `backend/src/modules/job-search/job-search.service.ts`
- Tests: matching existing document/service tests or add focused tests beside them.

- [x] 先覆盖 file input 选择、上传按钮可提交、失败提示的测试。
- [x] 复现当前上传请求，确认是前端事件、multipart 字段还是后端解析失败。
- [x] 修复可复现根因并增加中文错误提示。
- [x] 增加纯文本清洗规则：空白归一、孤立换行合并、标题/列表保留、乱码不臆改。
- [x] 运行前后端相关测试。

### Task 3: 岗位右栏 JD 摘要、编辑和 Morphicons 图标

**Files:**
- Modify: `frontend/src/modules/job-search/components/JobContextPanel.vue`
- Modify: `frontend/src/modules/job-search/views/JobListView.vue`
- Modify: `frontend/src/modules/job-search/api/index.ts`
- Tests: `JobListView.test.ts`, `JobDraftReview.test.ts` or focused component tests.

- [x] 先测试 pencil/trash 图标按钮的 accessible label、右栏编辑态和保存回调。
- [x] 将岗位卡片查看/删除改为线性 SVG 图标按钮，保留打招呼和简历调整文字按钮。
- [x] 在右栏详情下方增加 JD 编辑态，保存通过现有 `updateJob` API。
- [x] 让 JD 摘要区域 flex 填充剩余高度，同时内部滚动。
- [x] 运行组件测试并验证右栏不替换中间工作区。

### Task 4: 求职状态分析

**Files:**
- Modify: `frontend/src/modules/job-search/views/StatusListView.vue`
- Modify: `frontend/src/modules/job-search/store/index.ts`
- Modify: `frontend/src/modules/job-search/views/JobListView.vue`
- Tests: `StatusListView.test.ts`, `JobListView.test.ts`

- [x] 先测试按岗位 `statusId` 统计并支持点击筛选。
- [x] 增加状态统计 computed，不引入写死数字。
- [x] 在左侧展示统计，点击统计项跳转并筛选岗位列表，状态更新后刷新统计。
- [x] 运行状态和岗位页面测试。

### Task 5: 状态颜色预设与编辑间距

**Files:**
- Modify: `frontend/src/modules/job-search/views/StatusListView.vue`
- Modify: `frontend/src/modules/job-search/views/ResumeListView.vue`
- Test: matching view tests.

- [x] 测试颜色预设选择和保存值。
- [x] 用品牌协调的预设替代原生自由颜色输入：`#32F08C`、`#DDF7EA`、`#E8EEF2`、`#0A0B0D`。
- [x] 给简历编辑按钮组增加 `@space-md` 上间距。

### Task 6: 首页顶部导航与统一验证

**Files:**
- Modify: `frontend/src/layouts/DefaultLayout.vue`
- Modify: `frontend/src/layouts/DefaultLayout.test.ts`
- Modify: `docs/product-change-ledger.md`

- [x] 测试首页导航链接、当前项和右侧头像入口。
- [x] 增加首页顶部导航，不影响工作台三栏导航。
- [x] 运行前端完整测试、构建、后端测试和架构验证脚本。
- [x] 在本地页面复核 jobs/resumes/analysis/statuses 和首页。
