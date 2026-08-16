# Ripple Distortion Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally previewable, desktop-first `/` landing page with one randomly selected local photograph, native Vue/OGL pointer distortion, and a bottom-centered `Get started` entry to the existing workspace.

**Architecture:** Keep the current `DefaultLayout` and every `/job-search/*` URL, but make the home child route immersive through route metadata. Port only React Bits' framework-independent OGL/GLSL renderer into a typed Vue component, while `HomeView` owns random image selection and navigation. Static CSS imagery remains underneath the canvas so reduced-motion, loading, and renderer failures stay usable.

**Tech Stack:** Vue 3.5, TypeScript, Less, Vue Router 4, Vite 6, Vitest, Vue Test Utils, OGL `^1.0.11`, WebGL/GLSL.

## Global Constraints

- Do not add React, React DOM, Framer Motion, `motion/react`, `motion-v`, or `@vueuse/motion`.
- Add only `ogl@^1.0.11` as a new runtime dependency.
- Do not modify backend, database, API, Pinia stores, or existing business-module contracts.
- Preserve every existing `/job-search/*` route and the named route `job-search-jobs`.
- `/` displays no title, tagline, navigation, feature list, icon, slideshow controls, or secondary action.
- The only foreground control is `Get started`, bottom-centered at approximately `10vh` from the bottom.
- Choose one of the two local photographs once per mounted visit; do not change it while the view remains mounted.
- Desktop pointer movement creates normal waves; pointer-down creates a stronger wave.
- Reduced-motion, narrow-screen, image failure, or WebGL failure must preserve a static background and usable button.
- Bind pointer events to the component container, never `window`.
- Dispose `requestAnimationFrame`, `ResizeObserver`, pointer listeners, canvas, and WebGL context on unmount.
- Follow the existing Vue/TypeScript/Less naming and import conventions.

---

## File Map

- `frontend/src/components/RippleDistortion/types.ts`: public prop and enum-like union types.
- `frontend/src/components/RippleDistortion/index.vue`: OGL renderer ownership, Vue lifecycle, fallbacks, and shader-uniform updates.
- `frontend/src/components/RippleDistortion/style.less`: canvas stacking and static texture fallback.
- `frontend/src/components/RippleDistortion/RippleDistortion.test.ts`: reduced-motion and renderer-failure behavior.
- `frontend/src/views/HomeView.vue`: stable random image selection, single CTA, and named-route navigation.
- `frontend/src/views/HomeView.test.ts`: background selection stability and navigation behavior.
- `frontend/src/assets/landing/background-ocean.jpg`: project copy of `背景素材3.jpg`.
- `frontend/src/assets/landing/background-hills.jpg`: project copy of `背景素材4.jpg`.
- `frontend/src/router/index.ts`: replace the home redirect with lazy `HomeView` and immersive metadata; export route records for testing.
- `frontend/src/router/index.test.ts`: route contract test.
- `frontend/src/layouts/DefaultLayout.vue`: conditional workspace chrome and unconstrained immersive main area.
- `frontend/src/layouts/DefaultLayout.test.ts`: immersive/non-immersive layout behavior.
- `frontend/package.json`, `frontend/package-lock.json`: OGL dependency.

---

### Task 1: Native Vue Ripple Distortion component with static fallbacks

**Files:**
- Create: `frontend/src/components/RippleDistortion/types.ts`
- Create: `frontend/src/components/RippleDistortion/index.vue`
- Create: `frontend/src/components/RippleDistortion/style.less`
- Create: `frontend/src/components/RippleDistortion/RippleDistortion.test.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

**Reference source:**
- Read and port the renderer from `/Users/zhangxinrui/react-bits-main/src/ts-default/Animations/RippleDistortion/RippleDistortion.tsx`.
- Preserve its `waveVertex`, `waveFragment`, `screenVertex`, `compositeFragment`, instanced wave buffers, cover UV calculation, displacement target, and render loop verbatim unless Vue lifecycle integration requires a local variable change.
- Preserve the React Bits license notice through the repository's existing license-compliance convention; if none exists, add a short source comment above the port naming React Bits and its `MIT + Commons Clause` license.

**Interfaces:**
- Consumes: a browser DOM, the imported `ogl` primitives, and an image URL.
- Produces:

```ts
export type RippleTrigger = 'hover' | 'click' | 'both'
export type RippleQuality = 'low' | 'medium' | 'high'

export interface RippleDistortionProps {
  src: string
  brushSize?: number
  strength?: number
  swirl?: number
  rings?: number
  spread?: number
  fade?: number
  spacing?: number
  dispersion?: number
  glint?: number
  tint?: string
  tintAmount?: number
  grayscale?: boolean
  highlightColor?: string
  trigger?: RippleTrigger
  clickStrength?: number
  quality?: RippleQuality
  enabled?: boolean
}
```

- The component root must expose `data-ripple-state="static|interactive|error"` for deterministic tests and diagnostics.

- [ ] **Step 1: Install the only new runtime dependency**

Run:

```bash
cd frontend && npm install ogl@^1.0.11
```

Expected: `package.json` and `package-lock.json` add `ogl`; no React or motion dependency appears.

- [ ] **Step 2: Define the exact public types**

Create `frontend/src/components/RippleDistortion/types.ts` with:

```ts
export type RippleTrigger = 'hover' | 'click' | 'both'
export type RippleQuality = 'low' | 'medium' | 'high'

export interface RippleDistortionProps {
  src: string
  brushSize?: number
  strength?: number
  swirl?: number
  rings?: number
  spread?: number
  fade?: number
  spacing?: number
  dispersion?: number
  glint?: number
  tint?: string
  tintAmount?: number
  grayscale?: boolean
  highlightColor?: string
  trigger?: RippleTrigger
  clickStrength?: number
  quality?: RippleQuality
  enabled?: boolean
}
```

- [ ] **Step 3: Write failing fallback tests**

Create `frontend/src/components/RippleDistortion/RippleDistortion.test.ts` with two behaviors:

```ts
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RippleDistortion from './index.vue'

const rendererMock = vi.hoisted(() => vi.fn())

vi.mock('ogl', () => ({
  Renderer: rendererMock,
  Program: vi.fn(),
  Mesh: vi.fn(),
  Geometry: vi.fn(),
  Triangle: vi.fn(),
  Texture: vi.fn(),
  RenderTarget: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  rendererMock.mockReset()
})

describe('RippleDistortion fallbacks', () => {
  it('stays static when reduced motion is requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    )

    const wrapper = mount(RippleDistortion, { props: { src: '/background.jpg' } })

    expect(wrapper.attributes('data-ripple-state')).toBe('static')
    expect(wrapper.attributes('style')).toContain('background-image')
    expect(rendererMock).not.toHaveBeenCalled()
  })

  it('keeps the static image when renderer creation fails', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    )
    rendererMock.mockImplementation(() => {
      throw new Error('WebGL unavailable')
    })

    const wrapper = mount(RippleDistortion, { props: { src: '/background.jpg' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('data-ripple-state')).toBe('error')
    expect(wrapper.attributes('style')).toContain('background-image')
  })
})
```

- [ ] **Step 4: Run the focused test and confirm RED**

Run:

```bash
cd frontend && npm test -- src/components/RippleDistortion/RippleDistortion.test.ts
```

Expected: FAIL because `types.ts` and `index.vue` do not yet provide the component behavior.

- [ ] **Step 5: Implement the static component shell**

Create `index.vue` with this public shell before adding the renderer:

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { RippleDistortionProps } from './types'
import './style.less'

const props = withDefaults(defineProps<RippleDistortionProps>(), {
  brushSize: 150,
  strength: 0.12,
  swirl: 0.8,
  rings: 4,
  spread: 5,
  fade: 2.8,
  spacing: 15,
  dispersion: 0.015,
  glint: 0.12,
  tint: '#dff7ff',
  tintAmount: 0.04,
  grayscale: false,
  highlightColor: '#ffffff',
  trigger: 'both',
  clickStrength: 2,
  quality: 'medium',
  enabled: true,
})

const mountRef = useTemplateRef<HTMLDivElement>('mountRef')
const state = ref<'static' | 'interactive' | 'error'>('static')
const backgroundStyle = computed(() => ({ backgroundImage: `url("${props.src}")` }))
</script>

<template>
  <div
    ref="mountRef"
    class="ripple-distortion"
    :data-ripple-state="state"
    :style="backgroundStyle"
  />
</template>
```

Create `style.less` with:

```less
.ripple-distortion {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #07131a;
  background-position: center;
  background-size: cover;

  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
}
```

- [ ] **Step 6: Port the OGL renderer into Vue lifecycle hooks**

In `index.vue`, import:

```ts
import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture, Triangle } from 'ogl'
```

Copy the exact shader strings, helper types, `hexToRGB`, wave buffers, OGL programs, render target, resize logic, pointer math, and render loop from the reference source. Apply these mechanical substitutions:

- delete the React imports, `CSSProperties`, `className`, and `style` handling;
- replace `mountRef.current` with the `mount` argument passed into `createRenderer`;
- replace `configRef.current` reads with current `props` reads inside pointer handlers and the render loop;
- replace `uniformsRef.current` with module-local `uniforms` assigned after the OGL programs are created;
- attach `pointermove` and `pointerdown` to `mount`, not `window`;
- set `state.value = 'interactive'` immediately after `mount.appendChild(canvas)`;
- return the original cleanup body after changing listener removal from `window` to `mount`;
- keep `src` and `quality` renderer-recreation inputs out of the live uniform watcher.

Wrap that mechanically ported body with these Vue lifecycle boundaries:

```ts
let disposeRenderer: (() => void) | undefined
let updateUniforms: (() => void) | undefined

function prefersStaticPresentation(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(max-width: 760px)').matches
  )
}

function createRenderer(): () => void {
  const mount = mountRef.value
  if (!mount || !props.enabled || prefersStaticPresentation()) return () => undefined
  return mountRenderer(mount, props, value => {
    updateUniforms = value
    state.value = 'interactive'
  })
}

onMounted(() => {
  try {
    disposeRenderer = createRenderer()
  } catch (error) {
    console.warn('Ripple Distortion fell back to a static image.', error)
    state.value = 'error'
  }
})

watch(
  () => [
    props.rings,
    props.strength,
    props.swirl,
    props.dispersion,
    props.glint,
    props.tintAmount,
    props.grayscale,
    props.highlightColor,
    props.tint,
  ],
  () => updateUniforms?.(),
)

onBeforeUnmount(() => disposeRenderer?.())
```

Define `mountRenderer` in the same `<script setup>` block with this signature:

```ts
function mountRenderer(
  mount: HTMLDivElement,
  currentProps: Readonly<RippleDistortionProps>,
  ready: (update: () => void) => void,
): () => void
```

`mountRenderer` is the mechanically ported React effect body. Its `ready` callback receives a closure that applies all live prop values to the captured uniforms. Its returned cleanup closure must reference the captured `raf`, `ResizeObserver`, handlers, canvas, and GL context directly. After running that cleanup in `onBeforeUnmount`, set `state.value = 'static'`.

- [ ] **Step 7: Run fallback tests and type-check**

Run:

```bash
cd frontend && npm test -- src/components/RippleDistortion/RippleDistortion.test.ts
cd frontend && npm run type-check
```

Expected: both fallback tests PASS; type-check exits 0.

- [ ] **Step 8: Commit the component**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/RippleDistortion
git commit -m "feat: add Vue ripple distortion component"
```

---

### Task 2: Minimal random-image landing view

**Files:**
- Create: `frontend/src/assets/landing/background-ocean.jpg`
- Create: `frontend/src/assets/landing/background-hills.jpg`
- Create: `frontend/src/views/HomeView.vue`
- Create: `frontend/src/views/HomeView.test.ts`

**Interfaces:**
- Consumes: `RippleDistortionProps`, `RippleDistortion`, the named route `job-search-jobs`, and two Vite-imported image URLs.
- Produces: a route-level view with `.home-view`, `.home-view__gradient`, and `.home-view__start` selectors.

- [ ] **Step 1: Copy the approved source images without modifying them**

Run:

```bash
mkdir -p frontend/src/assets/landing
cp '/Users/zhangxinrui/Downloads/背景素材3.jpg' frontend/src/assets/landing/background-ocean.jpg
cp '/Users/zhangxinrui/Downloads/背景素材4.jpg' frontend/src/assets/landing/background-hills.jpg
```

Expected: SHA-256 checksums of each source and destination pair match.

- [ ] **Step 2: Write failing landing-view tests**

Create `frontend/src/views/HomeView.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeView from './HomeView.vue'

vi.mock('@/assets/landing/background-ocean.jpg', () => ({ default: '/ocean.jpg' }))
vi.mock('@/assets/landing/background-hills.jpg', () => ({ default: '/hills.jpg' }))

const RippleStub = {
  props: ['src'],
  template: '<div class="ripple-stub" :data-src="src" />',
}

async function mountHome(randomValue: number) {
  vi.spyOn(Math, 'random').mockReturnValue(randomValue)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/job-search/jobs', name: 'job-search-jobs', component: { template: '<div>Jobs</div>' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return {
    router,
    wrapper: mount(HomeView, {
      global: { plugins: [router], stubs: { RippleDistortion: RippleStub } },
    }),
  }
}

afterEach(() => vi.restoreAllMocks())

describe('HomeView', () => {
  it('selects one background and keeps it stable for the mounted visit', async () => {
    const { wrapper } = await mountHome(0)
    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/ocean.jpg')

    vi.mocked(Math.random).mockReturnValue(0.99)
    await wrapper.vm.$forceUpdate()

    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/ocean.jpg')
  })

  it('enters the existing job workspace', async () => {
    const { router, wrapper } = await mountHome(0.99)
    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/hills.jpg')

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('job-search-jobs'))
  })

  it('renders no marketing copy beyond the requested CTA', async () => {
    const { wrapper } = await mountHome(0)
    expect(wrapper.text()).toBe('Get started')
  })
})
```

- [ ] **Step 3: Run the focused test and confirm RED**

Run:

```bash
cd frontend && npm test -- src/views/HomeView.test.ts
```

Expected: FAIL because `HomeView.vue` does not exist.

- [ ] **Step 4: Implement the minimal view behavior**

Create `frontend/src/views/HomeView.vue` using this exact state boundary:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import RippleDistortion from '@/components/RippleDistortion/index.vue'
import oceanBackground from '@/assets/landing/background-ocean.jpg'
import hillsBackground from '@/assets/landing/background-hills.jpg'

const router = useRouter()
const backgrounds = [oceanBackground, hillsBackground] as const
const selectedBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)] ?? backgrounds[0]

function start(): void {
  void router.push({ name: 'job-search-jobs' })
}
</script>

<template>
  <section class="home-view">
    <RippleDistortion :src="selectedBackground" trigger="both" quality="medium" />
    <div class="home-view__gradient" aria-hidden="true" />
    <button class="home-view__start" type="button" @click="start">Get started</button>
  </section>
</template>
```

Add scoped Less in the same file with these non-negotiable layout values:

```less
.home-view {
  position: relative;
  width: 100%;
  min-height: 100dvh;
  overflow: hidden;
  background: #07131a;

  > .ripple-distortion {
    position: absolute;
    inset: 0;
  }

  &__gradient {
    position: absolute;
    inset: auto 0 0;
    height: 34vh;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, rgba(3, 12, 16, 0.3));
  }

  &__start {
    position: absolute;
    left: 50%;
    bottom: 10vh;
    min-width: 148px;
    min-height: 48px;
    padding: 0 28px;
    transform: translateX(-50%);
    border: 1px solid rgba(255, 255, 255, 0.48);
    border-radius: 999px;
    color: #fff;
    background: rgba(7, 20, 25, 0.24);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(14px) saturate(130%);
    font: inherit;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background-color 160ms ease-out, border-color 160ms ease-out, transform 160ms ease-out;

    &:hover {
      border-color: rgba(255, 255, 255, 0.72);
      background: rgba(255, 255, 255, 0.16);
    }

    &:active {
      transform: translateX(-50%) scale(0.97);
    }

    &:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 4px;
    }
  }
}
```

- [ ] **Step 5: Run the landing tests**

Run:

```bash
cd frontend && npm test -- src/views/HomeView.test.ts
```

Expected: three tests PASS.

- [ ] **Step 6: Commit the landing view and assets**

```bash
git add frontend/src/assets/landing frontend/src/views/HomeView.vue frontend/src/views/HomeView.test.ts
git commit -m "feat: add minimal ripple landing view"
```

---

### Task 3: Immersive home route without changing workspace URLs

**Files:**
- Modify: `frontend/src/router/index.ts:8-22`
- Create: `frontend/src/router/index.test.ts`
- Modify: `frontend/src/layouts/DefaultLayout.vue:1-159`
- Create: `frontend/src/layouts/DefaultLayout.test.ts`

**Interfaces:**
- Consumes: `HomeView.vue`, active route metadata, and existing module route arrays.
- Produces: exported `routes: RouteRecordRaw[]` and the boolean route contract `meta.immersive`.

- [ ] **Step 1: Write a failing route contract test**

Create `frontend/src/router/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { routes } from './index'

describe('root route', () => {
  it('renders an immersive home view instead of redirecting', () => {
    const layoutRoute = routes.find((route) => route.path === '/')
    const homeRoute = layoutRoute?.children?.find((route) => route.path === '')

    expect(homeRoute?.name).toBe('home')
    expect(homeRoute?.redirect).toBeUndefined()
    expect(homeRoute?.component).toBeTypeOf('function')
    expect(homeRoute?.meta).toEqual({ immersive: true })
  })
})
```

- [ ] **Step 2: Write failing immersive layout tests**

Create `frontend/src/layouts/DefaultLayout.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import DefaultLayout from './DefaultLayout.vue'

async function mountLayout(path: '/' | '/normal') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: DefaultLayout,
        children: [
          { path: '', component: { template: '<div>Home</div>' }, meta: { immersive: true } },
          { path: 'normal', component: { template: '<div>Normal</div>' } },
        ],
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(DefaultLayout, { global: { plugins: [router] } })
}

describe('DefaultLayout immersive mode', () => {
  it('removes workspace chrome and constraints on the home route', async () => {
    const wrapper = await mountLayout('/')
    expect(wrapper.find('.layout__header').exists()).toBe(false)
    expect(wrapper.get('.layout').classes()).toContain('layout--immersive')
    expect(wrapper.get('.layout__main').classes()).toContain('layout__main--immersive')
  })

  it('keeps workspace chrome on normal routes', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.get('.layout__header').text()).toContain('求职工作台')
    expect(wrapper.get('.layout').classes()).not.toContain('layout--immersive')
    expect(wrapper.get('.layout__main').classes()).not.toContain('layout__main--immersive')
  })
})
```

- [ ] **Step 3: Run focused tests and confirm RED**

Run:

```bash
cd frontend && npm test -- src/router/index.test.ts src/layouts/DefaultLayout.test.ts
```

Expected: FAIL because `routes` is not exported, home redirects, and layout ignores metadata.

- [ ] **Step 4: Replace the redirect with the immersive view**

Modify `frontend/src/router/index.ts`:

```ts
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: { immersive: true },
      },
      ...jobSearchRoutes,
      ...interviewPrepRoutes,
      ...todoRoutes,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]
```

Keep router construction unchanged and continue passing the exported `routes` array to it.

- [ ] **Step 5: Implement immersive layout behavior**

Change the layout script to:

```ts
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const immersive = computed(() => route.meta.immersive === true)
```

Change the structural template bindings to:

```vue
<div class="layout" :class="{ 'layout--immersive': immersive }">
  <header v-if="!immersive" class="layout__header">
    <RouterLink to="/" class="layout__brand">
      <span class="layout__mark" aria-hidden="true"></span>
      <span>求职工作台</span>
    </RouterLink>
    <nav class="layout__nav">
      <RouterLink to="/job-search/jobs" active-class="is-active">岗位</RouterLink>
      <RouterLink to="/job-search/resumes" active-class="is-active">简历</RouterLink>
      <RouterLink to="/job-search/analysis" active-class="is-active">分析</RouterLink>
      <RouterLink to="/job-search/statuses" active-class="is-active">状态</RouterLink>
    </nav>
  </header>
  <main class="layout__main" :class="{ 'layout__main--immersive': immersive }">
    <RouterView />
  </main>
</div>
```

Add these style rules:

```less
.layout--immersive {
  min-height: 100dvh;
  background: #07131a;

  &::before,
  &::after {
    display: none;
  }
}

.layout__main--immersive {
  width: 100%;
  margin: 0;
  padding: 0;
}
```

Inside the existing `@media (max-width: 760px)`, add a final override so the normal mobile rule cannot reconstrain immersive content:

```less
.layout__main--immersive {
  width: 100%;
  padding: 0;
}
```

- [ ] **Step 6: Run route and layout tests**

Run:

```bash
cd frontend && npm test -- src/router/index.test.ts src/layouts/DefaultLayout.test.ts
```

Expected: route and layout tests PASS.

- [ ] **Step 7: Run all frontend tests**

Run:

```bash
cd frontend && npm test
```

Expected: all existing and new tests PASS.

- [ ] **Step 8: Commit route integration**

```bash
git add frontend/src/router/index.ts frontend/src/router/index.test.ts frontend/src/layouts/DefaultLayout.vue frontend/src/layouts/DefaultLayout.test.ts
git commit -m "feat: make home route immersive"
```

---

### Task 4: Mechanical verification and real-browser preview

**Files:**
- Modify only files already listed if verification reveals a defect within the approved scope.

**Interfaces:**
- Consumes: the completed component, view, assets, route, and layout.
- Produces: passing repository checks and a desktop browser preview for user acceptance.

- [ ] **Step 1: Run formatting only on changed frontend source files**

Run Prettier with the explicit changed text-file list; do not format unrelated files:

```bash
cd frontend && npx prettier --write \
  src/components/RippleDistortion/index.vue \
  src/components/RippleDistortion/types.ts \
  src/components/RippleDistortion/style.less \
  src/components/RippleDistortion/RippleDistortion.test.ts \
  src/views/HomeView.vue \
  src/views/HomeView.test.ts \
  src/router/index.ts \
  src/router/index.test.ts \
  src/layouts/DefaultLayout.vue \
  src/layouts/DefaultLayout.test.ts
```

- [ ] **Step 2: Run the complete mechanical gate**

Run each command separately and require exit code 0:

```bash
cd frontend && npm test
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm run build
bash .agents/skills/vibecoding-verify/scripts/verify.sh
```

Expected: all tests pass, type-check/lint/build exit 0, and the repository script prints `verify: ALL PASSED`.

- [ ] **Step 3: Start a local preview server**

Run:

```bash
cd frontend && npm run dev -- --host 127.0.0.1
```

Keep the process running and open `http://127.0.0.1:5173/` in the in-app browser.

- [ ] **Step 4: Inspect the desktop landing page**

At a desktop viewport, verify all of the following:

- one photograph covers the full viewport with no empty bars;
- the chosen photograph stays fixed during the visit;
- moving the pointer produces localized, decaying distortion;
- clicking away from the CTA produces a visibly stronger wave;
- the canvas does not intercept or block the CTA;
- `Get started` is the only text and sits near the bottom center;
- focus indication is visible when tabbing to the button;
- the browser console contains no OGL, WebGL, texture, resize, or lifecycle errors.

- [ ] **Step 5: Inspect both randomized photographs**

Reload until each photograph appears. Capture one screenshot per photograph. Confirm centered cover cropping retains the ocean wave structure in `background-ocean.jpg` and the walking figure/cloud/hill relationship in `background-hills.jpg`.

- [ ] **Step 6: Inspect navigation and cleanup**

Activate `Get started` and verify the URL and named route resolve to the existing job list. Use the browser performance or console inspection to confirm the landing canvas is removed and its animation loop stops after navigation. Navigate back and confirm a fresh mount works.

- [ ] **Step 7: Inspect static fallbacks**

Emulate `prefers-reduced-motion: reduce` and verify the selected static photograph plus CTA remain visible with no pointer waves. Temporarily block WebGL in DevTools or exercise the renderer-failure test and confirm the same usable static state.

- [ ] **Step 8: Commit verification-only corrections, if any**

If browser or mechanical verification required approved-scope corrections:

```bash
git add frontend
git commit -m "fix: polish ripple landing preview"
```

If no correction was needed, do not create an empty commit.

- [ ] **Step 9: Present the preview for adoption decision**

Provide the two captured desktop screenshots, the local preview URL while the server remains available, mechanical verification results, and any crop/performance caveats. Explicitly state that the visual direction remains provisional until the user accepts the preview.

---

## Final Completion Gate

Before claiming the preview is ready, confirm:

- `git status --short` contains no unintended files;
- `npm test`, `npm run type-check`, `npm run lint`, and `npm run build` pass in `frontend/`;
- `bash .agents/skills/vibecoding-verify/scripts/verify.sh` exits 0 with `verify: ALL PASSED`;
- both local source/destination image checksum pairs match;
- the browser preview has been checked with both random backgrounds;
- leaving `/` removes the canvas and stops the animation loop;
- reduced-motion and renderer failure retain a static, operable page.
