# 首页动效与导航图标实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Color Bends + 低透明 Dot Field 重做首页，并以共享 SVG 图标替换工作台五个导航字符。

**Architecture:** 新增两个独立动效组件和一个导航图标组件。`HomeView` 只负责布局与路由入口，不负责 WebGL/canvas 算法；`DefaultLayout` 只传入图标名称，不内联五套 path。

**Tech Stack:** Vue 3、TypeScript、OGL、Canvas 2D、Less、Vitest、Vite。

## Global Constraints

- 首页不渲染旧 Ripple、自然背景、旧文案或单独 CTA 按钮。
- Dot Field 必须位于 Color Bends 下面并使用低透明度。
- Color Bends 参数固定为 rotation 90、speed 0.2、frequency 1、noise 0.15、bandWidth 0.14、intensity 1.3、iterations 1、颜色 `#32F08C`。
- 缩略图整块是键盘可访问的按钮并跳转 `/job-search/jobs`。
- 导航图标使用 24×24、1.75px、round caps/joins 的本地 SVG。

## Task 1: 动效组件测试与实现

- [ ] 在 `ColorBends.test.ts` 与 `DotField.test.ts` 写组件契约测试：挂载容器、保留关键 data 属性/层级 class、卸载不报错。
- [ ] 运行目标测试确认当前组件不存在而失败。
- [ ] 创建 `ColorBends.vue`，移植 React Bits GLSL 到 OGL；暴露颜色与参数 props，处理 ResizeObserver、pointermove、requestAnimationFrame 和清理。
- [ ] 创建 `DotField.vue`，移植 canvas 点阵、低透明度渐变、鼠标波动和清理逻辑；减少动效时不启动循环。
- [ ] 运行组件测试、type-check、lint。
- [ ] 提交 `feat: add vue color bends and dot field backgrounds`。

## Task 2: 首页结构与直接跳转

- [ ] 更新 `HomeView.test.ts` 失败断言：旧文案/按钮不存在，两个动效存在，两行新文案存在，缩略图具有 button 语义。
- [ ] 修改 `HomeView.vue`：删除旧资源与 Ripple，叠加 DotField/ColorBends，缩略图放右侧，整块 emit `start`。
- [ ] 调整 `DefaultLayout.test.ts`：点击 `.home-view__workspace-preview` 后路由为 `/job-search/jobs`。
- [ ] 在 `DefaultLayout.vue` 保持直接 router.push，不使用 scrollIntoView。
- [ ] 运行相关测试并提交 `feat: redesign landing with workspace preview`。

## Task 3: Morphicons 风格导航图标

- [ ] 在 `WorkspaceNavIcon.test.ts` 写五个名称均渲染 `svg[viewBox="0 0 24 24"]`、`stroke-width="1.75"`。
- [ ] 创建 `WorkspaceNavIcon.vue`，实现 briefcase、file-text、trend、kanban、message-square path。
- [ ] 替换 `DefaultLayout.vue` 五个字符图标，更新布局测试不再依赖 `aria-hidden` 字符节点而断言五个 SVG。
- [ ] 运行相关测试并提交 `feat: use outlined workspace navigation icons`。

## Task 4: 最终验证

- [ ] 运行 `npm test`、`npm run build`。
- [ ] 运行 `bash .agents/skills/vibecoding-verify/scripts/verify.sh`，确认 `verify: ALL PASSED`。
- [ ] 检查首页与 `/job-search/jobs`，确认点击缩略图直接切页、无滚动、五个图标为 SVG。

