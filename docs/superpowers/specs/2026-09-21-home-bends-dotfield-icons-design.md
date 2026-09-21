# 首页 Color Bends + Dot Field 与导航图标设计

## 目标

重做首页视觉：移除旧 Ripple、自然背景、旧品牌文案、说明文字和首页按钮；用 React Bits 中 Color Bends 与 Dot Field 的 Vue 移植组成全屏背景，并将工作台缩略图作为唯一入口，点击后直接路由到 `/job-search/jobs`。

同时替换工作台左侧五个 Unicode 字符图标，采用 Morphicons 所强调的统一 24×24 SVG 线性描边语言。

## 当前结构

- `frontend/src/views/HomeView.vue` 当前使用 `RippleDistortion`、两张自然背景和旧 hero 文案。
- `frontend/src/layouts/DefaultLayout.vue` 当前导航图标是 `▦、▤、⌁、☷、◌` 字符。
- 项目已经依赖 `ogl`，可复用 WebGL 渲染方式，不新增动效依赖。
- 首页进入工作区由 `DefaultLayout.startWorkspace` 完成；新首页缩略图继续调用同一入口。

## 目标架构

新增两个表现层组件：`ColorBends.vue` 使用 OGL + React Bits GLSL 参数；`DotField.vue` 使用 canvas 点阵与鼠标交互。`HomeView.vue` 将二者绝对定位叠加，Dot Field 在底层且低透明度，Color Bends 在上层并使用 `#32F08C`。左侧垂直居中展示两行错位文字，右侧为可点击的静态工作台缩略图。

新增 `WorkspaceNavIcon.vue`，通过 `name` 联合类型输出岗位、简历、分析、状态、面试五套 24×24 SVG path，统一 1.75 描边、圆角端点与当前色继承。

## 视觉与交互

- 首页不再有 CTA 按钮；点击整个缩略图区域跳转 `/job-search/jobs`，使用 `button` 语义并支持键盘 Enter/Space。
- 文案仅保留 `Job is on its way` 与加粗的 `Mom, life is an open wilderness`，左侧垂直居中、上下错开。
- Color Bends 使用 `rotation=90, speed=0.2, frequency=1, noise=0.15, bandWidth=0.14, intensity=1.3, iterations=1`，颜色为 `#32F08C`。
- Dot Field 使用较大点距、低 alpha 绿色渐变，不抢占文字和缩略图；支持 `prefers-reduced-motion` 时停用动画循环。
- 图标不引入 Morphicons 运行时包，使用本地 SVG 数据，避免静态导航增加依赖。

## 不变范围

不修改工作台路由、API、store、数据库和三栏壳层；不修改右侧上下文内容。

## 验收

1. 首页无 Ripple、自然图、旧文案和独立按钮。
2. 首页存在 Dot Field 和 Color Bends 两层动效，Color Bends 视觉主导。
3. 缩略图整块可点击并直接进入岗位页，不发生滚动。
4. 五个导航项渲染 SVG，不再出现 Unicode 字符图标。
5. `npm test`、`npm run build` 与架构验证全部通过。

