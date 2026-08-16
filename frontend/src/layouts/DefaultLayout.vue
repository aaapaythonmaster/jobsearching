<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isImmersive = computed(() => route.meta.immersive === true)
</script>

<template>
  <div class="layout" :class="{ 'layout--immersive': isImmersive }">
    <header v-if="!isImmersive" class="layout__header">
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
    <main class="layout__main" :class="{ 'layout__main--immersive': isImmersive }">
      <RouterView />
    </main>
  </div>
</template>

<style lang="less" scoped>
.layout {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: @color-text;
  background:
    radial-gradient(circle at 14% 10%, fade(@color-primary, 20%), transparent 24%),
    radial-gradient(circle at 82% 22%, fade(@color-primary, 12%), transparent 22%),
    linear-gradient(120deg, fade(#09070f, 98%), fade(#110b1d, 94%) 46%, fade(#09070f, 98%));
  isolation: isolate;

  &--immersive {
    min-height: 100dvh;
    overflow: hidden;
    background: #071116;

    &::before,
    &::after {
      content: none;
    }
  }

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 22% 18%, fade(@color-primary, 12%), transparent 32%),
      radial-gradient(ellipse at 78% 12%, fade(#ffffff, 7%), transparent 28%);
    opacity: 0.72;
  }

  &::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      linear-gradient(
        90deg,
        fade(#09070f, 92%) 0%,
        fade(#09070f, 58%) 44%,
        fade(#09070f, 86%) 100%
      ),
      linear-gradient(180deg, fade(#09070f, 16%) 0%, fade(#09070f, 96%) 100%);
  }

  &__header {
    position: sticky;
    top: 0;
    z-index: 20;
    min-height: 72px;
    padding: 0 max(@space-xl, calc((100vw - 1220px) / 2));
    background: fade(#100c18, 74%);
    border-bottom: 1px solid @color-border;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: @space-xl;
    box-shadow: @shadow-sm;
    backdrop-filter: blur(24px);
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: @space-md;
    font-weight: 700;
    font-size: @font-size-lg;
    color: @color-text;

    &:hover {
      color: @color-text;
    }
  }

  &__mark {
    width: 32px;
    height: 32px;
    border: 1px solid fade(@color-primary, 34%);
    border-radius: @radius-md;
    background:
      linear-gradient(135deg, fade(@color-primary, 62%), fade(@color-primary, 10%)),
      fade(#ffffff, 6%);
    box-shadow: @shadow-sm;
  }

  &__nav {
    display: flex;
    gap: 2px;
    padding: 5px;
    border: 1px solid @color-border;
    border-radius: @radius-md;
    background: fade(#ffffff, 5%);
    backdrop-filter: blur(20px);

    a {
      color: @color-text-secondary;
      min-height: 34px;
      display: inline-flex;
      align-items: center;
      padding: 0 @space-md;
      border-radius: @radius-sm;
      font-size: @font-size-md;
      transition:
        color @transition-fast,
        background-color @transition-fast;

      &:hover {
        color: @color-primary-hover;
        background: fade(@color-primary, 10%);
      }

      &.is-active {
        color: @color-text;
        background-color: fade(@color-primary, 16%);
      }
    }
  }

  &__main {
    flex: 1;
    width: min(1220px, calc(100% - 48px));
    margin: 0 auto;
    padding: @space-xxl 0 56px;

    &--immersive {
      width: 100%;
      min-height: 100dvh;
      margin: 0;
      padding: 0;
    }
  }
}

@media (max-width: 760px) {
  .layout {
    &__header {
      align-items: flex-start;
      flex-direction: column;
      padding: @space-md 14px;
    }

    &__nav {
      width: 100%;
      overflow-x: auto;
    }

    &__main {
      width: min(100% - 28px, 680px);
      padding-top: @space-xl;

      &--immersive {
        width: 100%;
        padding: 0;
      }
    }
  }
}
</style>
