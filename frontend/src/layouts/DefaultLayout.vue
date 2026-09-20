<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const route = useRoute()
const router = useRouter()
const landing = ref<HTMLElement | null>(null)
const workspace = ref<HTMLElement | null>(null)
const main = ref<HTMLElement | null>(null)

function enterWorkspace(): void {
  workspace.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  })
  main.value?.focus({ preventScroll: true })
}

async function returnHome(): Promise<void> {
  await router.push('/')
  await nextTick()
  landing.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  })
  landing.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
}

onMounted(() => {
  if (route.path !== '/') workspace.value?.scrollIntoView({ behavior: 'instant', block: 'start' })
})
</script>

<template>
  <div class="layout">
    <div ref="landing" class="layout__landing">
      <HomeView @start="enterWorkspace" />
    </div>
    <section ref="workspace" class="layout__workspace" aria-label="求职工作台">
      <aside class="layout__sidebar">
        <RouterLink to="/" class="layout__brand" @click.prevent="returnHome">
          <span class="layout__mark" aria-hidden="true"></span>
          <span>求职工作台</span>
        </RouterLink>
        <p class="layout__eyebrow">秋招资料与进展</p>
        <nav class="layout__nav" aria-label="工作台导航">
          <RouterLink
            to="/job-search/jobs"
            active-class="is-active"
            :class="{ 'is-active': route.path === '/' }"
          >
            <svg class="layout__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
            </svg>
            <span>岗位</span>
          </RouterLink>
          <RouterLink to="/job-search/resumes" active-class="is-active">
            <svg class="layout__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 3h9l3 3v15H6z" />
              <path d="M14 3v4h4M9 12h6M9 16h6" />
            </svg>
            <span>简历</span>
          </RouterLink>
          <RouterLink to="/job-search/analysis" active-class="is-active">
            <svg class="layout__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 19V5M4 19h17" />
              <path d="m7 15 4-4 3 2 5-6" />
              <path d="M17 7h2v2" />
            </svg>
            <span>分析</span>
          </RouterLink>
          <RouterLink to="/job-search/statuses" active-class="is-active">
            <svg class="layout__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18M8 4v5M16 4v5M7 13h3M14 13h3M7 16h3M14 16h3" />
            </svg>
            <span>状态</span>
          </RouterLink>
          <RouterLink to="/interviews" active-class="is-active">
            <svg class="layout__nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
              <path d="M8 10h8M8 13h5" />
            </svg>
            <span>面试</span>
          </RouterLink>
        </nav>
        <div class="layout__sidebar-footer">
          <span class="layout__status-dot" aria-hidden="true"></span>
          <span>工作台已就绪</span>
        </div>
      </aside>
      <div class="layout__content">
        <div class="layout__content-bar" aria-hidden="true">
          <span>WORKSPACE</span>
          <span class="layout__content-line"></span>
        </div>
        <main ref="main" class="layout__main" tabindex="-1">
          <RouterView />
        </main>
      </div>
    </section>
  </div>
</template>

<style lang="less" scoped>
.layout {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: @color-text;
  background: #edf5f6;
  isolation: isolate;
  overflow-anchor: none;

  &__landing {
    flex: none;
  }

  &__workspace {
    min-height: 100dvh;
    display: flow-root;
  }

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 8% 15%, rgba(96, 190, 225, 0.26), transparent 55%),
      radial-gradient(ellipse at 90% 62%, rgba(109, 195, 161, 0.22), transparent 55%),
      linear-gradient(145deg, #edf7fc, #f6faf9 48%, #eaf5ef);
  }

  &::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 50%);
  }

  &__sidebar {
    position: sticky;
    top: 24px;
    z-index: 20;
    min-height: calc(100dvh - 48px);
    padding: 24px 16px;
    .glass-surface();
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: @space-md;
    padding: 0 8px;
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
    border-radius: 11px;
    background:
      linear-gradient(145deg, rgba(41, 159, 202, 0.24), rgba(56, 160, 116, 0.14)),
      rgba(255, 255, 255, 0.7);
    box-shadow: @shadow-sm;
  }

  &__nav {
    display: grid;
    gap: 6px;
    margin-top: 22px;

    a {
      color: @color-text-secondary;
      min-height: 46px;
      display: inline-flex;
      align-items: center;
      gap: @space-md;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: @radius-md;
      font-size: @font-size-md;
      transition:
        color @transition-fast,
        background-color @transition-fast;

      &:hover {
        color: @color-primary-hover;
        background: fade(@color-primary, 10%);
        border-color: fade(@color-primary, 12%);
      }

      &.is-active {
        color: @color-primary-active;
        background: linear-gradient(100deg, fade(@color-primary, 14%), rgba(255, 255, 255, 0.5));
        border-color: fade(@color-primary, 16%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
      }
    }
  }

  &__nav-icon {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    color: currentColor;
    opacity: 0.78;
    transition:
      color @transition-fast,
      opacity @transition-fast,
      transform @transition-fast;
  }

  &__nav a:hover &__nav-icon,
  &__nav a.is-active &__nav-icon {
    opacity: 1;
  }

  &__nav a.is-active &__nav-icon {
    transform: translateY(-1px);
  }

  &__eyebrow {
    margin: 34px 8px 0;
    color: @color-text-disabled;
    font-size: @font-size-sm;
    letter-spacing: 0.08em;
  }

  &__sidebar-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: auto 8px 4px;
    color: @color-text-disabled;
    font-size: @font-size-sm;
  }

  &__status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: @color-success;
    box-shadow: 0 0 0 4px fade(@color-success, 12%);
  }

  &__workspace {
    width: min(1280px, calc(100% - 48px));
    margin: 0 auto;
    padding: 24px 0 56px;
    display: grid;
    grid-template-columns: 232px minmax(0, 1fr);
    align-items: start;
    gap: 28px;
  }

  &__content {
    min-width: 0;
  }

  &__content-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 28px;
    color: @color-text-disabled;
    font-size: 11px;
    letter-spacing: 0.14em;
  }

  &__content-line {
    height: 1px;
    flex: 1;
    background: @color-border;
  }

  &__main {
    flex: 1;
    width: 100%;
    padding: 14px 0 0;

    &:focus {
      outline: none;
    }
  }
}

@media (max-width: 760px) {
  .layout {
    &__workspace {
      width: calc(100% - 28px);
      grid-template-columns: 1fr;
      gap: 12px;
      padding-top: 8px;
    }

    &__sidebar {
      top: 8px;
      width: calc(100% - 28px);
      min-height: auto;
      padding: 14px;
      margin: 0 auto;
    }

    &__nav {
      display: flex;
      overflow-x: auto;
      margin-top: 14px;

      a {
        flex: 0 0 auto;
        min-height: 40px;
      }
    }

    &__eyebrow,
    &__sidebar-footer,
    &__content-bar {
      display: none;
    }

    &__main {
      padding-top: @space-md;
    }
  }
}
</style>
