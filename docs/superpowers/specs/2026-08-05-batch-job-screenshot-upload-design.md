# 批量岗位截图上传与逐条审核设计

## 背景与目标

当前“新增岗位”一次只能选择一张 JD 截图。前端将单个文件提交给 OCR 接口，取得 JD 原文后再调用字段解析接口，用户修改表单并保存一个岗位。

本次改动支持一次选择最多 10 张截图，每张截图独立代表一个岗位。系统以最多 2 个任务并发完成 OCR 与字段解析，并让用户逐条检查、修改和保存。识别或保存失败必须隔离在单个任务内，不能阻塞其他截图。

## Current structure

- `frontend/src/modules/job-search/views/JobListView.vue` 包含当前单图文件控件、OCR/解析调用、岗位表单和岗位列表。
- `frontend/src/modules/job-search/api/index.ts` 提供单图 `extractJobImage(file)`、文本 `parseJob(input)` 和单岗位 `createJob(input)` 接口。
- `frontend/src/modules/job-search/store/index.ts` 的 `createJob` 负责创建岗位并把结果加入现有岗位列表。
- `backend/src/modules/job-search/job-search.controller.ts` 通过 `req.file()` 接收单个文件。
- `backend/src/modules/job-search/index.ts` 将 multipart 文件数量限制为 1；单文件最大请求限制为 10 MB。
- `backend/src/modules/job-search/job-search.service.ts` 校验图片类型和 8 MB 业务上限，并依次尝试本机 Vision OCR 与 AI OCR。
- 仓库目前没有前后端测试文件或测试脚本。

## Target architecture

批量编排仅发生在前端 `job-search` 闭环模块中。后端继续保持单图、单次解析和单岗位创建契约。

数据流如下：

1. 用户一次选择 1–10 张图片。
2. 前端为每张图片创建带本地唯一 ID 的队列任务。
3. 调度器最多同时运行 2 个任务；每个任务先调用 `extractJobImage(file)`，再调用 `parseJob({ jdText })`。
4. 两步成功后生成可编辑的 `JobPostCreateInput` 草稿，并进入待确认状态。
5. 用户在右侧审核表单中修改当前草稿，点击“确认并保存”。
6. 前端调用现有 store 的 `createJob`；成功后岗位出现在列表中，任务退出待确认队列，并自动选择下一条待确认任务。

队列状态为：

- `queued`：等待识别。
- `extracting`：正在 OCR 并解析字段。
- `ready`：识别完成，等待人工确认。
- `saving`：正在创建岗位。
- `extract_failed`：OCR 或字段解析失败，可重试或移除。
- `save_failed`：创建岗位失败，保留草稿，可再次保存或移除。

`saved` 只作为成功反馈的瞬时状态；成功任务随后从待处理队列移除，避免队列长期累积已完成记录。

## UI and interaction

采用“左侧任务队列 + 右侧单条审核”布局：

- 左侧顶部提供“选择截图”入口和已选择数量，列表显示缩略图、文件名与状态。
- 左侧任务可切换；默认优先选中第一条 `ready` 任务。正在编辑的任务保持选中，后台新完成任务不会抢占焦点。
- 右侧只显示当前任务的审核表单，字段沿用公司、岗位、方向、城市、薪资、状态、备注和 JD 原文。
- “跳过”切换到下一条可审核任务，但保留当前草稿。
- “移除此项”只作用于未保存任务；识别中的任务标记为已移除，异步结果返回后不得重新加入队列。
- “重试”从原始 `File` 重新执行 OCR 与字段解析，并清除该任务此前的识别错误。
- 保存前必须校验公司、岗位、方向和 JD 原文。保存失败时保留用户已修改内容。
- 与当前单图流程不同，保存后停留在岗位列表页，不跳转到岗位详情页。

## Input limits and errors

- 一次最多接收 10 张；超过时整次选择不入队，并提示“单次最多上传 10 张截图”。
- 仅接受 MIME 类型以 `image/` 开头的文件；包含非图片时，合法图片进入队列，不合法文件以文件名汇总提示。
- 单张文件不得超过 8 MB；超限文件不进入队列，并以文件名汇总提示。
- 文件名不作为唯一键，同名截图使用本地唯一 ID 区分。
- 一个任务的 OCR、解析或保存失败不会暂停调度器；空出的并发槽位立即处理下一条等待任务。
- 重试遵守相同的 2 并发限制，避免绕过调度器产生额外并发。

## Change boundary

预计修改：

- `frontend/src/modules/job-search/views/JobListView.vue`：接入批量队列布局，保留岗位筛选与列表职责。
- `frontend/src/modules/job-search/composables/useJobImageQueue.ts`：任务创建、并发调度、状态转换、重试和移除。
- `frontend/src/modules/job-search/components/JobImageQueue.vue`：队列上传入口、缩略图、状态和任务操作。
- `frontend/src/modules/job-search/components/JobDraftReview.vue`：当前任务表单、校验、跳过和保存事件。
- `frontend/src/modules/job-search/types/index.ts`：增加前端队列任务与状态类型。
- `frontend/package.json` 和锁文件：加入 Vitest 与测试脚本。
- `.gitignore`：忽略 `.superpowers/` 本地草图运行目录。

明确不修改：

- 后端路由、controller、service、schema、multipart 限制和数据库迁移。
- 现有单图 OCR、JD 文本解析和单岗位创建 API 契约。
- 岗位详情页、简历、分析、状态和面试准备模块。

## Component contracts

`useJobImageQueue` 暴露：

- 只读任务列表、当前任务 ID、活动任务数和是否仍在处理。
- `addFiles(files)`：校验并加入任务，触发调度。
- `selectTask(id)`、`selectNextReady()`：控制审核焦点。
- `retryTask(id)`：将失败任务重新排队。
- `removeTask(id)`：移除或取消关注未保存任务。
- `updateDraft(id, patch)`：保存当前人工编辑内容。
- `markSaving(id)`、`markSaved(id)`、`markSaveFailed(id, message)`：由页面的岗位创建流程驱动保存状态。

队列 composable 通过注入或参数接收 OCR/解析函数，以便单元测试使用可控替身，不直接依赖组件或全局 store。

## Execution order

1. 配置 Vitest，并先编写队列调度失败测试。
2. 实现任务类型和 `useJobImageQueue`，直至并发、隔离、重试、移除和限制测试通过。
3. 编写审核组件的关键交互测试，再实现队列与审核组件。
4. 将组件接入 `JobListView.vue`，复用现有 API 与 store 创建流程。
5. 完成样式、可访问名称、错误提示和保存后焦点切换。
6. 执行自动化检查和本地浏览器验收。

## Verification

自动化检查：

- `cd frontend && npm test`
- `cd frontend && npm run type-check`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `bash .agents/skills/vibecoding-verify/scripts/verify.sh`

单元与交互覆盖：

- 最多同时运行 2 个识别任务。
- 一项失败不影响其他任务继续处理。
- 失败任务重试后可以进入待确认状态。
- 识别中移除的任务不会因异步返回重新出现。
- 超过 10 张、非图片和超过 8 MB 的文件按规则拒绝。
- 人工修改的草稿在切换任务、跳过和保存失败后保持不变。
- 保存成功更新岗位列表、移除任务并选择下一条待确认任务。

浏览器验收：

- 在 `/job-search/jobs` 一次选择多张真实截图，核对队列状态和并发行为。
- 分别验证成功、OCR 失败、解析失败、重试、移除、跳过和保存失败路径。
- 确认逐条保存后仍停留在列表页，已创建岗位立即显示在岗位列表中。
