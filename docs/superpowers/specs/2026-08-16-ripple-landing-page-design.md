# Ripple Distortion Landing Page Design

## Summary

Replace the current `/` redirect with an immersive desktop-first landing page.
The page uses a native Vue 3 port of React Bits' Ripple Distortion effect over
one of two local photographs chosen randomly when the page mounts. The only
foreground control is a bottom-centered `Get started` button that opens the
existing job-search workspace.

The prototype must be locally previewable before the visual treatment is
accepted as a permanent product direction.

## Goals

- Reproduce the pointer-driven Ripple Distortion effect without adding React.
- Use both user-provided photographs as local, production-controlled assets.
- Keep the landing page visually minimal: no product name, tagline, navigation,
  feature list, or secondary controls.
- Preserve every existing `/job-search/*` workspace route and business flow.
- Release all animation and WebGL resources when the user leaves the landing
  page.
- Provide static fallbacks for reduced-motion preferences and unavailable
  WebGL.

## Non-goals

- Redesigning the existing workspace, navigation, or business modules.
- Adding backend endpoints, database changes, authentication, analytics, or
  content management.
- Creating a fully optimized mobile interaction design in this iteration.
- Embedding React or running a React island inside the Vue application.
- Automatically changing the background while the user remains on the page.

## Current Structure

- `frontend/src/router/index.ts` defines `/` as a child of
  `DefaultLayout.vue` and redirects it to `job-search-jobs`.
- `frontend/src/layouts/DefaultLayout.vue` always renders the sticky workspace
  header and constrains main content to a 1220px container.
- `frontend/src/modules/job-search/routes.ts` owns the existing
  `/job-search/*` route family.
- `frontend/src/App.vue` only renders the active router view.
- The frontend is Vue 3, TypeScript, Less, Vite, Pinia, and Vue Router. It does
  not currently depend on OGL or React.

## Chosen Approach

Port the React Bits component to a native Vue component while retaining its
framework-independent rendering core:

- Keep the OGL renderer, WebGL programs, GLSL shaders, instanced wave geometry,
  displacement render target, and compositing logic.
- Replace React refs and effects with Vue template refs and lifecycle hooks.
- Use Vue watchers to update live shader uniforms without reconstructing the
  renderer.
- Rebuild the renderer only when a texture source or quality tier changes.
- Do not import React, React DOM, `motion/react`, Framer Motion, `motion-v`, or
  `@vueuse/motion`.

This approach adds only the `ogl` runtime dependency and keeps the component
idiomatic for the existing Vue application.

## Target Architecture

### Routing and immersive layout

`frontend/src/router/index.ts` will replace the empty-path redirect with a lazy
loaded `HomeView.vue` route carrying `meta: { immersive: true }`.

`DefaultLayout.vue` will read the active route metadata. In immersive mode it
will:

- hide the workspace header;
- remove the 1220px width constraint, margins, and page padding;
- allow the route view to occupy the full viewport.

For all other routes, the layout remains unchanged. Existing workspace URLs do
not move.

### Landing view

`frontend/src/views/HomeView.vue` owns landing-page composition only:

- select one background once during component setup using `Math.random()`;
- pass the selected imported asset URL into `RippleDistortion`;
- render a subtle bottom readability gradient;
- render one `Get started` button approximately `10vh` above the viewport
  bottom;
- navigate to the named `job-search-jobs` route when the button is activated.

The selection remains stable for the lifetime of the mounted view. Returning
to `/` creates a new view instance and may select either image again.

### Ripple component

`frontend/src/components/RippleDistortion/` will expose a reusable component
with typed props. Its initial public surface includes:

- `src`;
- `brushSize`, `strength`, `swirl`, `rings`, `spread`, `fade`, and `spacing`;
- `dispersion`, `glint`, `tint`, `tintAmount`, and `highlightColor`;
- `trigger`, `clickStrength`, `quality`, and `enabled`.

The prototype will use the `both` trigger on desktop: pointer movement creates
normal waves and pointer-down creates a stronger wave. The component will bind
pointer listeners to its own container rather than `window`, preventing the
effect from reacting outside its visible surface.

The component owns and cleans up:

- the OGL renderer and canvas;
- `requestAnimationFrame`;
- `ResizeObserver`;
- pointer listeners;
- image-loading state;
- the WebGL context and retained uniform references.

### Assets

Copy, without modifying the originals, these files:

- `/Users/zhangxinrui/Downloads/背景素材3.jpg`
- `/Users/zhangxinrui/Downloads/背景素材4.jpg`

Store project copies under `frontend/src/assets/landing/` with ASCII names.
Import them through Vite so the production build hashes their filenames.

The first preview will use centered `cover` cropping. Both images are portrait
oriented, so desktop crop quality is an explicit review point. If the preview
shows unacceptable subject loss, create deliberate desktop crops in a later,
separately approved visual refinement.

## Visual Design

- The canvas fills `100dvw × 100dvh` and uses the selected photograph as a
  cover texture.
- Preserve the photographs' original blue and green color. Grayscale is off.
- Add only a light bottom gradient for button contrast; do not add a global
  dark overlay that hides the photographs.
- `Get started` is a translucent glass pill with white text, a fine light
  border, restrained blur, and no icon.
- Hover gently brightens the button. Active state scales it to `0.97` with fast
  feedback.
- No title, tagline, navigation, pagination dots, background switcher, or
  automatic slideshow appears.

The initial ripple tuning should be visible but restrained: medium brush size,
low dispersion, light glint, and approximately 2.5–3 seconds of decay. Exact
values are prototype tuning variables rather than product contract values and
will be adjusted only after observing the local preview.

## Performance and Accessibility

- Start with a medium-resolution displacement buffer and cap device pixel
  ratio at 2.
- Animate only the WebGL canvas; do not animate layout properties.
- If `prefers-reduced-motion: reduce` matches, render the selected photograph
  statically and do not run the ripple animation loop.
- If WebGL initialization or image texture loading fails, keep the selected
  photograph visible as a CSS background fallback and leave `Get started`
  usable.
- On narrow screens, prioritize a static cover image and usable button. Mobile
  ripple tuning is outside this iteration.
- The button remains a semantic button with a visible keyboard focus state.

## Change Boundary

Expected changes:

- `frontend/src/views/HomeView.vue`
- `frontend/src/views/HomeView.test.ts`
- `frontend/src/components/RippleDistortion/index.vue`
- `frontend/src/components/RippleDistortion/types.ts`
- `frontend/src/components/RippleDistortion/style.less`
- `frontend/src/assets/landing/background-ocean.jpg`
- `frontend/src/assets/landing/background-hills.jpg`
- `frontend/src/router/index.ts`
- `frontend/src/layouts/DefaultLayout.vue`
- `frontend/package.json`
- `frontend/package-lock.json`

No backend, database, API, Pinia store, or business-module contract changes are
allowed.

## Contracts and State

- No network or persistence contract changes.
- No backend request or response changes.
- No shared domain type changes.
- New route behavior: `/` renders the landing page instead of redirecting.
- Existing destination: `Get started` resolves the named route
  `job-search-jobs`.
- UI state is local and ephemeral: one selected image URL and WebGL lifecycle
  state.

## Testing

Automated tests will cover behavior that is stable outside a real GPU:

- `/` resolves to the landing page with immersive route metadata.
- Exactly one local background is selected per mounted `HomeView` instance.
- `Get started` navigates to the named `job-search-jobs` route.
- `DefaultLayout` hides workspace chrome and removes the constrained main style
  only for immersive routes.
- Reduced-motion or renderer failure preserves a visible static image and an
  operable button.

Shader appearance, pointer feel, texture crop, and frame smoothness require a
browser feel-check rather than snapshot assertions.

## Execution Order

1. Add failing route, landing behavior, and fallback tests.
2. Add `ogl` and the local image assets.
3. Implement the Vue Ripple Distortion component and lifecycle cleanup.
4. Implement `HomeView.vue` and its random, stable image selection.
5. Add immersive route handling to the router and layout.
6. Run focused tests, full frontend tests, type-check, lint, and build.
7. Run the repository architecture verification script.
8. Launch Vite and inspect the landing page in a real browser with both images,
   pointer movement, pointer-down, navigation, reduced-motion, and static
   fallback states.
9. Present the local preview to the user. Visual adoption remains provisional
   until the user approves the result.

## Verification

Mechanical checks:

```bash
cd frontend && npm test
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm run build
bash .agents/skills/vibecoding-verify/scripts/verify.sh
```

Browser checks at desktop width:

- refresh repeatedly and confirm either photograph can be selected;
- confirm the selected photograph does not change during a mounted visit;
- move the pointer and confirm smooth, localized waves;
- click and confirm a stronger wave without accidental navigation;
- confirm the button sits near the bottom center and remains legible;
- activate `Get started` and confirm the existing workspace opens;
- navigate back and confirm the previous WebGL loop no longer runs;
- emulate reduced motion and confirm a static background remains;
- inspect both centered crops for unacceptable subject loss;
- check the console for WebGL, texture, observer, and lifecycle errors.

## Acceptance Criteria

The prototype is ready for user visual review when:

- `/` displays a full-screen randomly selected local photograph;
- desktop pointer movement and click create the intended ripple distortion;
- only the bottom-centered `Get started` control overlays the photograph;
- the control enters the unchanged job-search workspace;
- failure and reduced-motion modes retain a usable static landing page;
- all mechanical verification passes; and
- a browser preview is available for the user to accept or reject.
