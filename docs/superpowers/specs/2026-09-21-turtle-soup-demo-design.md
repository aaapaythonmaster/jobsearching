# 海龟汤 AI 主持人 Demo 设计

## 目标

做一个可直接试玩的单人海龟汤 Demo，验证“阅读汤面 → 提问 → 获得是/不是/不重要 → 查看历史 → 猜出汤底”的核心循环。暂不加入登录、多人房间、题库管理、积分或持久化。

## 方案

采用后端代理的 AI 主持人，并提供本地兜底：

1. 前端只调用本站 `/api/turtle-soup/*`，不暴露模型密钥。
2. 后端优先调用兼容 OpenAI Chat Completions 的模型接口。
3. 未配置模型环境变量、网络失败或模型返回格式异常时，使用内置故事规则给出可玩的三态回答。
4. 后端对模型输出做 Zod 校验与枚举归一化，前端永远只处理 `是`、`不是`、`不重要` 三种结果。

## 当前仓库结构依据

- 前端通过 `frontend/src/router/index.ts` 聚合模块路由，业务代码位于 `frontend/src/modules/<name>/`。
- 现有前端模块拥有 `api`、`store`、`types`、`views`、`routes.ts` 与 `index.ts`，请求封装遵循 `utils/request.ts`。
- 后端通过 `backend/src/routes.ts` 注册模块，模块内已有 `*.schema.ts`、`*.controller.ts`、`*.service.ts`、`*.routes.ts`、`index.ts` 的闭环模式。
- 后端响应遵循 `{ code, data, message }`，数据库驱动通过 `backend/src/db` 抽象；本 Demo 不需要数据库。

## 用户流程

1. 进入“海龟汤”页面，展示示例汤面、玩法说明和输入区。
2. 玩家输入问题，或在浏览器支持时点击麦克风进行语音转文字。
3. 前端提交问题和当前故事 ID；后端返回三态判定、简短解释、会话消息 ID。
4. 页面把问题与回答追加到历史列表，保留滚动位置与当前提问状态。
5. 玩家可以点击“查看汤底”结束当前挑战，展示完整真相与关键线索；也可重新开始。

## 模块边界

### 后端 `backend/src/modules/turtle-soup/`

- `turtle-soup.schema.ts`：故事、提问请求、主持人回答和汤底结果的 Zod schema。
- `turtle-soup.types.ts`：仅从 schema 推导或组合运行时类型。
- `turtle-soup.service.ts`：加载内置故事、调用模型、解析与兜底判定。
- `turtle-soup.controller.ts`：将 service 结果映射为统一响应。
- `turtle-soup.routes.ts`：注册故事详情、提问、揭示汤底三个端点。
- `index.ts`：唯一公开模块表面。

不新增 migration、repository 或数据库表。

### 前端 `frontend/src/modules/turtle-soup/`

- `api/index.ts`：调用三个后端端点。
- `types/index.ts`：镜像后端响应字段。
- `store/index.ts`：保存当前故事、提问历史、提交中状态、错误和是否揭示汤底。
- `views/TurtleSoupView.vue`：单页游戏界面。
- `components/QuestionComposer.vue`：文字输入、麦克风状态、提交按钮。
- `components/QuestionHistory.vue`：历史问答列表与空状态。
- `routes.ts`、`index.ts`：注册 `/turtle-soup` 路由。

语音识别使用浏览器 `SpeechRecognition`/`webkitSpeechRecognition`（若可用）；不新增第三方依赖，API 不可用时隐藏或禁用麦克风按钮并保持文字输入可用。

## API 合同

### `GET /api/turtle-soup/stories/demo`

返回当前内置故事的公开信息：

```ts
{ id: string; title: string; surface: string; difficulty: 'easy' | 'medium' | 'hard' }
```

### `POST /api/turtle-soup/stories/:storyId/questions`

请求：

```ts
{ question: string }
```

响应数据：

```ts
{
  question: string
  verdict: 'yes' | 'no' | 'irrelevant'
  verdictLabel: '是' | '不是' | '不重要'
  hint: string
}
```

空问题、超长问题和未知故事 ID 返回明确的 4xx 错误；模型失败不向前端暴露供应商错误，而是记录日志并走兜底。

### `GET /api/turtle-soup/stories/:storyId/solution`

返回汤底与关键线索，仅由用户主动点击揭示时调用：

```ts
{ solution: string; keyClues: string[] }
```

## 内置故事与兜底

内置一则适合演示的短故事，包含公开汤面、完整汤底、关键线索及可匹配的问题主题。兜底规则只处理高频主题（人物是否死亡、地点、时间、物件、动机等），未命中的问题返回“不重要”，保证即使没有模型配置也能完成基本试玩。

## 错误与安全边界

- 不把 API Key、模型原始响应或完整内部提示词发送给浏览器。
- 对问题长度做上限，避免无界输入；后端对模型返回严格解析，异常时兜底。
- 前端提交期间禁用重复提交；网络错误可重试，历史记录不丢失。
- 揭示汤底后锁定继续提问，重新开始会清空本地会话状态。

## 测试与验证

- 后端 schema/service 测试：有效问题、空问题、三种判定、模型异常兜底、未知故事。
- 前端视图测试：汤面渲染、提问追加历史、提交中禁用、揭示汤底、语音 API 不存在时的回退。
- 运行前端 type-check、lint、test 与后端 type-check、lint、相关测试。
- 最后运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`，必须得到 `verify: ALL PASSED`。

## 不在本次范围

- 登录与用户身份
- 多人同步、房间和主持人权限
- 故事编辑器、题库后台和持久化记录
- 流式模型输出、语音合成和移动端原生录音
