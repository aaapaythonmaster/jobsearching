<script setup lang="ts">
import { useRouter } from 'vue-router'
import RippleDistortion from '@/components/RippleDistortion/index.vue'
import oceanBackground from '@/assets/landing/background-ocean.jpg'
import hillsBackground from '@/assets/landing/background-hills.jpg'

const router = useRouter()
const backgrounds = [oceanBackground, hillsBackground] as const
const selectedBackground =
  backgrounds[Math.floor(Math.random() * backgrounds.length)] ?? backgrounds[0]

function start(): void {
  void router.push({ name: 'job-search-jobs' })
}
</script>

<template>
  <section class="home-view">
    <RippleDistortion
      class="home-view__ripple"
      :src="selectedBackground"
      trigger="both"
      quality="medium"
    />
    <div class="home-view__gradient" aria-hidden="true"></div>
    <button class="home-view__start" type="button" @click="start">Get started</button>
  </section>
</template>

<style lang="less" scoped>
.home-view {
  position: relative;
  width: 100%;
  min-height: 100dvh;
  overflow: hidden;
  background: #07131a;

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

  &__start {
    position: absolute;
    left: 50%;
    bottom: 10vh;
    z-index: 1;
    min-width: 148px;
    min-height: 48px;
    padding: 0 28px;
    border: 1px solid rgba(244, 251, 255, 0.58);
    border-radius: 999px;
    color: #f4fbff;
    background: rgba(3, 16, 22, 0.46);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.16),
      0 12px 36px rgba(0, 16, 24, 0.24);
    transform: translateX(-50%);
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
      background: rgba(244, 251, 255, 0.2);
    }

    &:active {
      transform: translateX(-50%) scale(0.97);
    }

    &:focus-visible {
      outline: 2px solid #f4fbff;
      outline-offset: 4px;
    }
  }
}

@supports not (backdrop-filter: blur(1px)) {
  .home-view__start {
    background: rgba(3, 16, 22, 0.82);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .home-view__start {
    background: rgba(3, 16, 22, 0.9);
    backdrop-filter: none;
  }
}
</style>
