<script setup lang="ts">
import ColorBends from '@/components/ColorBends.vue'
import DotField from '@/components/DotField.vue'

</script>

<template>
  <main class="home-view">
    <DotField
      :dot-opacity="0.32"
      :dot-radius="1"
      :dot-spacing="22"
      :bulge-strength="67"
      :glow-radius="160"
      :sparkle="false"
      :wave-amplitude="0"
      :cursor-radius="650"
      :cursor-force="0.17"
      :glow-opacity="0.1"
      glow-color="#32F08C"
      gradient-from="#70F5AF"
      gradient-to="#29B16B"
    />
    <ColorBends
      :colors="['#32F08C']"
      :rotation="90"
      :auto-rotate="0"
      :speed="0.2"
      :transparent="true"
      :scale="1"
      :frequency="1"
      :warp-strength="1"
      :mouse-influence="1"
      :parallax="0.5"
      :noise="0.15"
      :band-width="1"
      :intensity="1.3"
      :iterations="1"
    />
    <div class="home-view__shell">
      <div class="home-view__copy">
        <p class="home-view__line home-view__line--calligraphy home-view__line--first">Job is on its way</p>
      </div>
    </div>
  </main>
</template>

<style lang="less" scoped>
@import (css) url('https://fonts.googleapis.com/css2?family=Pochaevsk&display=swap');
.home-view { position: relative; min-height: 100dvh; overflow: hidden; color: #06150d; background: #120f17; isolation: isolate; }
.home-view__shell { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr; align-items: center; width: min(1320px, calc(100% - 112px)); min-height: 100dvh; margin: 0 auto; }
.home-view__copy { min-width: 0; max-width: 760px; }
.home-view__line { margin: 0; color: rgba(240, 255, 246, 0.92); font-size: clamp(28px, 3.5vw, 58px); line-height: 1.03; letter-spacing: -0.045em; text-wrap: balance; }
.home-view__line--calligraphy { font-family: 'Pochaevsk', cursive; font-weight: 400; font-size: clamp(67px, calc(3.5vw + 39px), 97px); letter-spacing: 0; line-height: 1.12; }
.home-view__line--first { margin-left: clamp(0px, 2vw, 32px); }
@media (max-width: 920px) { .home-view__shell { width: min(640px, calc(100% - 48px)); padding: 72px 0; } }
</style>
