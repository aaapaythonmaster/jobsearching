<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import RippleDistortion from '@/components/RippleDistortion/index.vue'
import oceanBackground from '@/assets/landing/background-ocean.jpg'
import hillsBackground from '@/assets/landing/background-hills.jpg'

const emit = defineEmits<{ start: [] }>()
const hero = ref<HTMLElement | null>(null)
const rippleEnabled = ref(true)
let visibilityObserver: IntersectionObserver | undefined
onMounted(() => {
  if (!hero.value || typeof IntersectionObserver === 'undefined') return
  visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      rippleEnabled.value = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0)
    },
    { threshold: 0.01 },
  )
  visibilityObserver.observe(hero.value)
})
onUnmounted(() => visibilityObserver?.disconnect())
const backgrounds = [oceanBackground, hillsBackground] as const
const selectedBackground =
  backgrounds[Math.floor(Math.random() * backgrounds.length)] ?? backgrounds[0]

function start(): void {
  emit('start')
}
</script>

<template>
  <section ref="hero" class="home-view">
    <div class="home-view__shell">
      <div class="home-view__copy">
        <div class="home-view__brand">
          <span class="home-view__mark" aria-hidden="true"></span>
          <span>求职工作台</span>
        </div>
        <h1 class="home-view__headline">把每一次求职推进，变成可见的下一步。</h1>
        <p>岗位、简历、面试问题，集中在一个安静而清晰的工作台里。</p>
        <div class="home-view__actions">
          <button class="home-view__start" type="button" @click="start">Get started</button>
          <span class="home-view__note">从岗位收集开始，持续推进你的秋招。</span>
        </div>
      </div>

      <div class="home-view__visual" aria-label="求职工作台预览">
        <div class="home-view__visual-frame">
          <RippleDistortion
            class="home-view__ripple"
            :src="selectedBackground"
            :enabled="rippleEnabled"
            trigger="both"
            quality="medium"
          />
          <div class="home-view__gradient" aria-hidden="true"></div>
          <div class="home-view__visual-label">
            <span>WORKSPACE</span>
            <span class="home-view__visual-line"></span>
            <span>01</span>
          </div>
          <div class="home-view__insight">
            <span class="home-view__insight-kicker">本周求职进度</span>
            <strong>把准备过的，都留下来。</strong>
            <div class="home-view__insight-items">
              <span><i></i>岗位</span>
              <span><i></i>简历</span>
              <span><i></i>面试</span>
            </div>
          </div>
        </div>
        <p class="home-view__caption">自然光下的求职工作台 · 收集、整理、复盘</p>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.home-view {
  position: relative;
  width: 100%;
  min-height: 100dvh;
  overflow: hidden;
  color: #152d3b;
  background:
    radial-gradient(circle at 8% 12%, rgba(126, 207, 230, 0.22), transparent 36%),
    radial-gradient(circle at 92% 84%, rgba(120, 198, 163, 0.18), transparent 32%),
    #edf6f5;

  &__shell {
    width: min(1240px, calc(100% - 96px));
    min-height: 100dvh;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
    align-items: center;
    gap: clamp(36px, 6vw, 96px);
    padding: 68px 0;
  }

  &__copy {
    position: relative;
    z-index: 2;
    max-width: 540px;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 36px;
    color: #2c5362;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  &__mark {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(0, 103, 192, 0.28);
    border-radius: 12px;
    background:
      linear-gradient(145deg, rgba(41, 159, 202, 0.24), rgba(56, 160, 116, 0.14)),
      rgba(255, 255, 255, 0.72);
    box-shadow: 0 8px 20px rgba(40, 77, 94, 0.08);
  }

  &__headline {
    max-width: 520px;
    margin: 0;
    color: #152d3b;
    font-family: 'Songti SC', 'STSong', 'Noto Serif CJK SC', serif;
    font-size: clamp(42px, 4.2vw, 62px);
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.08;
    text-wrap: balance;
  }

  &__copy > p {
    max-width: 430px;
    margin-top: 24px;
    color: #506470;
    font-size: 17px;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 34px;

    > .home-view__note {
      max-width: none;
      color: #617581;
      font-size: 12px;
      letter-spacing: -0.01em;
      line-height: 1.45;
      white-space: nowrap;
    }
  }

  &__visual {
    position: relative;
    min-width: 0;
  }

  &__visual-frame {
    position: relative;
    min-height: min(72vh, 680px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 34px;
    background: rgba(255, 255, 255, 0.46);
    box-shadow:
      0 28px 80px rgba(32, 75, 87, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.92);
    transform: rotate(1.3deg);
  }

  &__ripple {
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

  &__visual-label {
    position: absolute;
    top: 22px;
    right: 24px;
    left: 24px;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-shadow: 0 1px 12px rgba(0, 16, 24, 0.38);
  }

  &__visual-line {
    height: 1px;
    flex: 1;
    background: rgba(255, 255, 255, 0.5);
  }

  &__insight {
    position: absolute;
    right: 24px;
    bottom: 24px;
    left: 24px;
    max-width: 360px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px 22px;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 20px;
    color: #173747;
    background: rgba(248, 253, 253, 0.74);
    box-shadow:
      0 18px 50px rgba(32, 75, 87, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px) saturate(130%);
  }

  &__insight-kicker {
    color: #617581;
    font-size: 11px;
    letter-spacing: 0.08em;
  }

  &__insight strong {
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  &__insight-items {
    display: flex;
    gap: 18px;
    margin-top: 8px;
    color: #506470;
    font-size: 12px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16734b;
      box-shadow: 0 0 0 4px rgba(22, 115, 75, 0.1);
    }
  }

  &__caption {
    margin-top: 18px;
    color: #617581;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-align: right;
  }

  &__start {
    min-width: 148px;
    min-height: 48px;
    padding: 0 28px;
    border: 1px solid rgba(255, 255, 255, 0.88);
    border-radius: 999px;
    color: #152d3b;
    background: rgba(255, 255, 255, 0.76);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      0 12px 36px rgba(0, 16, 24, 0.16);
    backdrop-filter: blur(14px) saturate(130%);
    font: inherit;
    font-weight: 650;
    letter-spacing: 0.01em;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 160ms cubic-bezier(0.23, 1, 0.32, 1),
      border-color 160ms cubic-bezier(0.23, 1, 0.32, 1),
      transform 160ms cubic-bezier(0.23, 1, 0.32, 1);

    &:hover {
      border-color: rgba(244, 251, 255, 0.82);
      background: rgba(255, 255, 255, 0.9);
    }

    &:active {
      transform: scale(0.97);
    }

    &:focus-visible {
      outline: 2px solid #0067c0;
      outline-offset: 4px;
    }
  }
}

@supports not (backdrop-filter: blur(1px)) {
  .home-view__start {
    background: #f8fcfd;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .home-view__start {
    background: #f8fcfd;
    backdrop-filter: none;
  }

  .home-view__insight {
    background: #f8fcfd;
    backdrop-filter: none;
  }
}
</style>
