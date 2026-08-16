# 面试问题复盘入口设计

## 背景与目标

当前项目已经在 `interview-prep` 模块内提供按岗位录入真实面试问题、回答分析、自我介绍和 FAQ 等能力，但入口只存在于岗位详情页，顶部导航无法直接访问。用户需要一个更容易发现的“面试”入口，并将第一版“面试复盘”严格限定为记录真实面试问题。

本次目标是：在顶部导航新增“面试”，提供所有岗位的面试总览，并允许进入某个岗位后记录“面试轮次 + 问题内容”。不新增评分、结果、回答、总结或 AI 能力。

## 当前结构

- 顶部导航位于 `frontend/src/layouts/DefaultLayout.vue`，当前包含岗位、简历、分析和状态。
- 前端面试模块位于 `frontend/src/modules/interview-prep/`，已有路由、API、Pinia store、类型和 `InterviewPrepView.vue`。
- 后端面试模块位于 `backend/src/modules/interview-prep/`，公开前缀为 `/api/interview-prep`。
- 现有问题接口包括按岗位查询、创建、更新和删除问题。
- 现有 `interview_prep_questions` 表已经保存 `job_post_id`、轮次、问题内容、回答、备注和时间戳。
- 现有面试准备路由为 `/job-search/jobs/:jobPostId/interview-prep`，只可从岗位详情进入。

## 用户体验

### 顶部入口

默认工作台顶部导航新增“面试”，指向 `/interviews`。沉浸式首页继续隐藏整个工作台导航，不受本次修改影响。

### 面试总览

`/interviews` 展示所有岗位的面试卡片。每张卡片包含：

- 公司名称；
- 职位名称；
- 已记录问题数量；
- 最近一条问题的记录时间；
- 进入该岗位复盘详情的操作。

卡片按最近问题时间倒序排列；尚未记录问题的岗位排在已有记录的岗位之后，并沿用岗位创建时间的稳定顺序。

如果没有岗位，页面展示空状态和“先添加岗位”入口，跳转到 `/job-search/jobs`。

### 问题复盘详情

`/interviews/:jobPostId` 展示当前岗位的公司和职位，并提供：

- 轮次选择：初面、复面、终面、HR 面、笔试、其他；
- 选择“其他”时显示自定义轮次输入框；
- 问题内容输入框；
- “保存问题”按钮；
- 按创建时间倒序排列的历史问题列表。

表单只提交轮次、可选自定义轮次和问题内容。`userAnswer` 与 `notes` 不由新页面填写。保存成功后清空问题内容并把新记录放到列表顶部；保存失败时保留输入内容并显示错误。空问题不能提交，保存期间禁用重复提交。

第一版不在新页面提供编辑、删除、回答分析、简历绑定、自我介绍、FAQ、面试评分、面试结果或总结。现有面试准备页面和已有 API 继续保留。

## 目标架构

本次扩展现有 `interview-prep` 闭环模块，不创建新的跨模块依赖。

后端数据流：

`route -> controller -> service -> repository -> Database interface`

前端数据流：

`view -> interview-prep store/API -> utils/request.ts -> backend`

前端页面不会直接调用 `fetch`，后端不会直接导入数据库驱动。现有问题表足以支持本需求，因此不新增数据库迁移。

## API 与数据契约

### 新增面试岗位总览

`GET /api/interview-prep/projects`

成功响应继续使用项目统一信封：

```json
{
  "code": 0,
  "data": [
    {
      "jobPostId": "job-id",
      "companyName": "公司",
      "jobTitle": "职位",
      "questionCount": 3,
      "latestQuestionAt": "2026-08-16T12:00:00.000Z"
    }
  ],
  "message": "success"
}
```

`latestQuestionAt` 在尚无问题时为 `null`。响应必须由后端 zod schema 定义，前端类型与字段完全一致。

### 复用现有问题接口

- `GET /api/interview-prep/projects/:jobPostId/questions`
- `POST /api/interview-prep/projects/:jobPostId/questions`

创建请求示例：

```json
{
  "roundLabel": "初面",
  "customRound": null,
  "questionText": "请介绍一次你解决复杂问题的经历。"
}
```

现有 schema 允许省略 `userAnswer` 与 `notes`，不需要修改数据库字段或破坏已有客户端。

## 前端组成

- `InterviewOverviewView.vue`：加载并展示岗位面试卡片与空状态。
- `InterviewQuestionReviewView.vue`：并行加载岗位总览与当前岗位问题，从总览中取得公司和职位，管理最小录入表单；不调用包含简历与 AI 结果的完整准备摘要接口。
- `interview-prep/routes.ts`：增加 `/interviews` 与 `/interviews/:jobPostId`，保留旧路由。
- `interview-prep/api/index.ts`：增加总览和问题列表方法，继续复用创建方法。
- `interview-prep/store/index.ts`：增加总览状态，以及面向新详情页的轻量问题加载状态；避免要求加载简历、FAQ 等无关数据。
- `DefaultLayout.vue`：新增“面试”导航项。

## 错误与边界状态

- 总览加载失败时显示可读错误，不展示伪造卡片。
- 岗位不存在时，后端返回统一 404，详情页显示错误并提供返回面试总览的入口。
- 问题为空或仅含空白字符时，前端不发请求；后端 zod schema 继续作为最终校验。
- 选择“其他”但未输入自定义轮次时，使用现有后端规范保存 `customRound: null`，列表回退显示“其他”。
- 保存失败保留轮次、问题内容和自定义轮次，允许用户修正或重试。

## 变更边界

预计修改：

- `backend/src/modules/interview-prep/` 内的 schema、repository、service、controller 和 routes；
- `frontend/src/modules/interview-prep/` 内的类型、API、store、routes 和新增页面；
- `frontend/src/layouts/DefaultLayout.vue`；
- 对应后端与前端测试。

明确不修改：

- `job-search` 模块的数据表和 API；
- 现有 `InterviewPrepView.vue` 的准备与 AI 功能；
- 涟漪首页及其随机背景逻辑；
- 数据库迁移和已有问题记录。

## 执行顺序

1. 以失败测试定义总览 API 的统计与排序契约。
2. 实现后端 zod schema、repository、service、controller 与 route。
3. 以失败测试定义前端导航、总览卡片和问题录入行为。
4. 实现前端类型、API、store、路由和两个页面。
5. 运行格式、测试、类型检查、lint、生产构建和项目架构门禁。
6. 启动本地前后端，在桌面浏览器验证顶部入口、总览、问题保存和返回流程。

## 验证标准

- 顶部导航可见“面试”，点击进入 `/interviews`。
- 所有岗位卡片显示正确的问题数量和最近记录时间。
- 无岗位时可跳转添加岗位。
- 详情页只呈现轮次、问题输入和历史问题，不出现 AI 与回答相关功能。
- 保存问题后无需刷新即可在列表顶部看到新记录。
- 保存失败不会丢失输入。
- 现有面试准备路由继续可用。
- 前后端测试、type-check、lint、build 均通过。
- `bash .agents/skills/vibecoding-verify/scripts/verify.sh` 输出 `verify: ALL PASSED`。
