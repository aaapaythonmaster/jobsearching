<script setup lang="ts">
import ColorBends from '@/components/ColorBends.vue'
import DotField from '@/components/DotField.vue'

const emit = defineEmits<{ start: [] }>()

function openWorkspace(): void {
  emit('start')
}
</script>

<template>
  <main class="home-view">
    <DotField :opacity="0.14" :dot-spacing="20" :dot-radius="1.1" />
    <ColorBends
      :colors="['#32F08C']"
      :rotation="90"
      :speed="0.2"
      :frequency="1"
      :noise="0.15"
      :band-width="0.14"
      :intensity="1.3"
      :iterations="1"
    />
    <div class="home-view__wash" aria-hidden="true"></div>
    <div class="home-view__shell">
      <div class="home-view__copy">
        <p class="home-view__line home-view__line--first">Job is on its way</p>
        <p class="home-view__line home-view__line--second"><strong>Mom, life is an open wilderness</strong></p>
      </div>
      <div
        class="home-view__workspace-preview"
        role="button"
        tabindex="0"
        aria-label="打开求职工作台"
        @click="openWorkspace"
        @keydown.enter.prevent="openWorkspace"
        @keydown.space.prevent="openWorkspace"
      >
        <div class="home-view__preview-bar"><span class="home-view__preview-dot"></span><span>求职工作台</span><span class="home-view__preview-meta">WORKSPACE</span></div>
        <div class="home-view__preview-body">
          <aside class="home-view__preview-sidebar">
            <span class="home-view__preview-brand"></span>
            <span class="home-view__preview-nav home-view__preview-nav--active"></span>
            <span class="home-view__preview-nav"></span>
            <span class="home-view__preview-nav"></span>
            <span class="home-view__preview-nav"></span>
          </aside>
          <div class="home-view__preview-main"><span class="home-view__preview-heading"></span><span class="home-view__preview-card"></span><span class="home-view__preview-card home-view__preview-card--short"></span></div>
          <div class="home-view__preview-context"><span class="home-view__preview-heading"></span><span class="home-view__preview-detail"></span><span class="home-view__preview-detail home-view__preview-detail--short"></span></div>
        </div>
        <span class="home-view__preview-hint">进入工作台 ↗</span>
      </div>
    </div>
  </main>
</template>

<style lang="less" scoped>
.home-view { position: relative; min-height: 100dvh; overflow: hidden; color: #06150d; background: #07170d; isolation: isolate; }
.home-view__wash { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(circle at 64% 50%, rgba(50, 240, 140, 0.16), transparent 42%), linear-gradient(110deg, rgba(3, 16, 9, 0.76), rgba(4, 14, 9, 0.12) 58%, rgba(3, 16, 9, 0.54)); }
.home-view__shell { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 0.84fr) minmax(420px, 0.98fr); align-items: center; gap: clamp(48px, 9vw, 144px); width: min(1320px, calc(100% - 112px)); min-height: 100dvh; margin: 0 auto; }
.home-view__copy { min-width: 0; }
.home-view__line { margin: 0; color: rgba(240, 255, 246, 0.92); font-size: clamp(28px, 3.5vw, 58px); line-height: 1.03; letter-spacing: -0.045em; text-wrap: balance; }
.home-view__line--first { margin-left: clamp(0px, 2vw, 32px); }
.home-view__line--second { margin-top: 18px; margin-left: clamp(34px, 7vw, 118px); color: #32f08c; }
.home-view__line--second strong { font-weight: 720; }
.home-view__workspace-preview { position: relative; min-height: 420px; overflow: hidden; border: 1px solid rgba(211, 255, 228, 0.36); border-radius: 18px; background: rgba(8, 28, 17, 0.68); box-shadow: 0 30px 100px rgba(0, 0, 0, 0.34), 0 0 0 8px rgba(50, 240, 140, 0.04); cursor: pointer; transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease; }
.home-view__workspace-preview:hover, .home-view__workspace-preview:focus-visible { transform: translateY(-6px); border-color: rgba(50, 240, 140, 0.9); box-shadow: 0 34px 110px rgba(0, 0, 0, 0.42), 0 0 0 8px rgba(50, 240, 140, 0.1); outline: none; }
.home-view__preview-bar { display: flex; align-items: center; gap: 9px; height: 42px; padding: 0 14px; border-bottom: 1px solid rgba(224, 255, 236, 0.16); color: rgba(236, 255, 243, 0.92); font-size: 11px; }
.home-view__preview-dot { width: 11px; height: 11px; border-radius: 3px; background: #32f08c; }.home-view__preview-meta { margin-left: auto; color: rgba(236, 255, 243, 0.42); font-size: 9px; letter-spacing: .12em; }
.home-view__preview-body { display: grid; grid-template-columns: 26% 46% 28%; height: 378px; }.home-view__preview-sidebar, .home-view__preview-main, .home-view__preview-context { padding: 18px 12px; }.home-view__preview-sidebar { border-right: 1px solid rgba(224, 255, 236, 0.12); background: rgba(1, 10, 5, 0.32); }.home-view__preview-main { border-right: 1px solid rgba(224, 255, 236, 0.12); }.home-view__preview-brand { display: block; width: 70%; height: 10px; margin-bottom: 27px; border-radius: 3px; background: rgba(236, 255, 243, 0.76); }.home-view__preview-nav { display: block; width: 82%; height: 25px; margin-top: 8px; border-radius: 4px; background: rgba(236, 255, 243, 0.12); }.home-view__preview-nav--active { background: rgba(50, 240, 140, 0.62); }.home-view__preview-heading { display: block; width: 44%; height: 14px; border-radius: 3px; background: rgba(236, 255, 243, 0.78); }.home-view__preview-card { display: block; height: 110px; margin-top: 22px; border: 1px solid rgba(236, 255, 243, 0.2); border-radius: 8px; background: rgba(236, 255, 243, 0.08); }.home-view__preview-card--short { height: 78px; margin-top: 12px; }.home-view__preview-detail { display: block; width: 80%; height: 9px; margin-top: 32px; border-radius: 3px; background: rgba(236, 255, 243, 0.38); }.home-view__preview-detail--short { width: 60%; margin-top: 12px; }.home-view__preview-hint { position: absolute; right: 16px; bottom: 13px; color: #32f08c; font-size: 11px; letter-spacing: .04em; }
@media (max-width: 920px) { .home-view__shell { grid-template-columns: 1fr; width: min(640px, calc(100% - 48px)); gap: 42px; padding: 72px 0; }.home-view__workspace-preview { min-height: 340px; }.home-view__preview-body { height: 298px; } }
@media (prefers-reduced-motion: reduce) { .home-view__workspace-preview { transition: none; } }
</style>
