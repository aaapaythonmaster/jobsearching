<script setup lang="ts">
import ColorBends from '@/components/ColorBends.vue'
import DotField from '@/components/DotField.vue'
import careerPathTexture from '@/assets/landing/career-path-texture.png'

</script>

<template>
  <main class="home-view">
    <img class="home-view__texture" :src="careerPathTexture" alt="" aria-hidden="true">
    <DotField
      :dot-opacity="0.18"
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
      :intensity="0.62"
      :iterations="1"
    />
    <div class="home-view__shell">
      <div class="home-view__copy">
        <p class="home-view__eyebrow">秋 / 春招记录 · 2025—2026</p>
        <h1 class="home-view__line home-view__line--calligraphy home-view__line--first">把下一份工作，<br><em>准备得更具体。</em></h1>
        <p class="home-view__description">收集岗位，打磨简历，复盘每一次面试。<br>让机会从模糊的期待，变成清晰的下一步。</p>
        <div class="home-view__actions">
          <RouterLink to="/job-search/jobs" class="home-view__action home-view__action--primary">查看岗位库 <span aria-hidden="true">↗</span></RouterLink>
          <RouterLink to="/interviews" class="home-view__action home-view__action--quiet">进入面试准备 <span aria-hidden="true">→</span></RouterLink>
        </div>
      </div>
      <div class="home-view__meta" aria-label="工作台说明">
        <span>记录你的路径</span><span class="home-view__meta-line" aria-hidden="true"></span><span>从今天开始</span>
      </div>
      <aside class="home-view__signal" aria-label="工作台入口">
        <p class="home-view__signal-title">你的求职工作台</p>
        <p class="home-view__signal-copy">把分散的准备，放进同一条清晰的路径。</p>
        <p class="home-view__signal-state"><span aria-hidden="true"></span>准备开始 · 选择一个入口</p>
        <nav class="home-view__signal-nav">
          <RouterLink to="/job-search/jobs" class="is-featured"><span>01</span><strong>岗位记录</strong><span aria-hidden="true">↗</span></RouterLink>
          <RouterLink to="/job-search/resumes"><span>02</span><strong>简历版本</strong><span aria-hidden="true">↗</span></RouterLink>
          <RouterLink to="/interviews"><span>03</span><strong>面试复盘</strong><span aria-hidden="true">↗</span></RouterLink>
        </nav>
      </aside>
    </div>
  </main>
</template>

<style lang="less" scoped>
@import (css) url('https://fonts.googleapis.com/css2?family=Pochaevsk&display=swap');
.home-view { position: relative; min-height: 100dvh; overflow: hidden; color: #06150d; background: #120f17; isolation: isolate; }
.home-view__texture { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .7; mix-blend-mode: screen; filter: saturate(.78) contrast(1.08); }
.home-view::after { content: ''; position: absolute; z-index: 1; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(3, 15, 9, .42), transparent 42%, rgba(3, 15, 9, .08)); }
.home-view__shell { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; width: min(1320px, calc(100% - 112px)); min-height: 100dvh; margin: 0 auto; padding: 104px 0 54px; }
.home-view__copy { min-width: 0; max-width: 760px; }
.home-view__eyebrow { margin: 0 0 24px; color: rgba(194, 255, 214, .72); font-size: 11px; letter-spacing: .18em; text-transform: uppercase; }
.home-view__line { margin: 0; color: rgba(240, 255, 246, 0.94); font-size: clamp(28px, 3.5vw, 58px); line-height: 1.03; letter-spacing: -0.045em; text-wrap: balance; }
.home-view__line--calligraphy { font-family: 'Pochaevsk', cursive; font-weight: 400; font-size: clamp(58px, calc(3.5vw + 36px), 94px); letter-spacing: 0; line-height: .98; }
.home-view__line--calligraphy em { color: #a9f5c5; font-style: normal; }
.home-view__line--first { margin-left: clamp(0px, 2vw, 32px); }
.home-view__description { margin: 30px 0 0 clamp(0px, 2vw, 32px); color: rgba(232, 249, 238, .8); font-size: 15px; line-height: 1.8; }
.home-view__actions { display: flex; align-items: center; gap: 24px; margin: 36px 0 0 clamp(0px, 2vw, 32px); }
.home-view__action { display: inline-flex; align-items: center; gap: 18px; min-height: 44px; color: #eafff1; font-size: 13px; letter-spacing: .02em; transition: color .2s ease, background .2s ease, transform .2s ease; }
.home-view__action span { font-size: 18px; line-height: 1; }
.home-view__action--primary { padding: 0 19px; border: 1px solid rgba(201, 255, 218, .68); border-radius: 2px; color: #07180e; background: #b5f5c9; font-weight: 700; }
.home-view__action--primary:hover { background: rgba(65, 190, 115, .42); transform: translateY(-2px); }
.home-view__action--quiet { color: rgba(235, 252, 241, .86); }
.home-view__action--quiet:hover { color: #fff; }
.home-view__meta { display: flex; align-items: center; gap: 12px; margin-top: auto; color: rgba(212, 244, 222, .64); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
.home-view__meta-line { width: 56px; height: 1px; background: rgba(183, 240, 200, .36); }
.home-view__signal { position: absolute; right: 0; bottom: 84px; width: 262px; padding: 20px 0 0 22px; border-left: 1px solid rgba(183, 240, 200, .52); }
.home-view__signal-title { margin: 0; color: rgba(246, 255, 249, .98); font-size: 14px; font-weight: 650; letter-spacing: .06em; }
.home-view__signal-copy { max-width: 210px; margin: 9px 0 20px; color: rgba(232, 249, 238, .78); font-size: 12px; line-height: 1.6; }
.home-view__signal-state { display: flex; align-items: center; gap: 7px; margin: 0 0 10px; color: rgba(201, 248, 215, .76); font-size: 10px; letter-spacing: .04em; }
.home-view__signal-state span { width: 6px; height: 6px; border-radius: 50%; background: #b5f5c9; box-shadow: 0 0 10px rgba(181, 245, 201, .78); }
.home-view__signal-nav { display: grid; gap: 0; }
.home-view__signal-nav a { display: grid; grid-template-columns: 28px 1fr 16px; align-items: center; gap: 8px; min-height: 34px; border-top: 1px solid rgba(183, 240, 200, .24); color: rgba(236, 252, 241, .84); font-size: 12px; transition: color .2s ease, transform .2s ease; }
.home-view__signal-nav a.is-featured { color: #f6fff9; background: rgba(140, 225, 162, .11); }
.home-view__signal-nav a:last-child { border-bottom: 1px solid rgba(183, 240, 200, .16); }
.home-view__signal-nav a span:first-child { color: rgba(183, 240, 200, .5); font-size: 10px; }
.home-view__signal-nav a span:last-child { text-align: right; color: rgba(183, 240, 200, .64); }
.home-view__signal-nav a:hover { transform: translateX(5px); color: #fff; }
@media (max-width: 920px) { .home-view__shell { width: min(640px, calc(100% - 48px)); padding: 116px 0 38px; } .home-view__line--calligraphy { font-size: clamp(54px, 10vw, 78px); } }
@media (max-width: 920px) { .home-view__signal { right: 0; bottom: 34px; left: auto; width: min(48%, 280px); } .home-view__meta { display: none; } }
@media (max-width: 700px) { .home-view__signal { right: -14px; width: min(42%, 220px); } }
@media (max-width: 560px) { .home-view__actions { align-items: flex-start; flex-direction: column; gap: 14px; } .home-view__signal { bottom: 24px; } }
</style>
