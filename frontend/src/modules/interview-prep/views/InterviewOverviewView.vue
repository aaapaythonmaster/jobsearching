<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useInterviewPrepStore } from '../store'

const store = useInterviewPrepStore()
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' })

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : '尚未记录'
}

onMounted(async () => {
  try {
    await store.loadReviewProjects()
  } catch {
    // The store exposes a contextual error state for the page.
  }
})
</script>

<template>
  <section class="interview-overview">
    <header class="interview-overview__head">
      <h2>面试复盘</h2>
      <p>按岗位记录真实面试问题。</p>
    </header>

    <section class="interview-overview__summary" aria-label="面试准备概览">
      <div><span>面试项目</span><strong>{{ store.projects.length }}</strong></div>
      <div><span>待复盘问题</span><strong>{{ store.projects.reduce((total, item) => total + item.questionCount, 0) }}</strong></div>
      <div><span>下一步</span><strong>进入岗位复盘</strong></div>
    </section>

    <div
      v-if="store.reviewError"
      class="interview-overview__state interview-overview__state--error"
    >
      <strong>面试记录加载失败</strong>
      <p>{{ store.reviewError }}</p>
    </div>

    <div
      v-else-if="store.reviewLoading && store.projects.length === 0"
      class="interview-overview__grid"
    >
      <div
        v-for="index in 2"
        :key="index"
        class="interview-card interview-card--skeleton"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>
    </div>

    <div v-else-if="store.projects.length === 0" class="interview-overview__state">
      <h3>还没有岗位</h3>
      <p>添加岗位后，就可以按岗位记录面试问题。</p>
      <RouterLink class="interview-overview__primary-link" to="/job-search/jobs"
        >先添加岗位</RouterLink
      >
    </div>

    <div v-else class="interview-overview__grid" aria-label="面试项目列表">
      <article v-for="project in store.projects" :key="project.jobPostId" class="interview-card">
        <div class="interview-card__body">
          <p class="interview-card__company">{{ project.companyName }}</p>
          <h3>{{ project.jobTitle }}</h3>
          <dl>
            <div>
              <dt>问题记录</dt>
              <dd>{{ project.questionCount }} 个问题</dd>
            </div>
            <div>
              <dt>最近记录</dt>
              <dd>{{ formatDate(project.latestQuestionAt) }}</dd>
            </div>
          </dl>
        </div>
        <RouterLink
          class="interview-card__action"
          :to="{ name: 'interview-question-review', params: { jobPostId: project.jobPostId } }"
        >
          进入复盘
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<style lang="less" scoped>
.interview-overview {
  display: flex;
  flex-direction: column;
  gap: @space-xl;

  &__head {
    max-width: 68ch;

    h2 {
      margin-bottom: @space-xs;
      font-size: @font-size-xxl;
    }

    p {
      color: @color-text-secondary;
    }
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: @space-md;

    > div {
      .workspace-surface();
      display: flex;
      min-height: 88px;
      flex-direction: column;
      justify-content: space-between;
      gap: @space-sm;
      padding: @space-lg;
    }

    span {
      color: @color-text-secondary;
      font-size: @font-size-sm;
    }

    strong {
      color: @color-text;
      font-size: @font-size-xl;
      font-weight: 650;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: @space-lg;
  }

  &__state {
    min-height: 240px;
    padding: @space-xxl;
    border: 1px solid @color-border;
    border-radius: @radius-md;
    .workspace-surface();
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
    gap: @space-sm;

    p {
      color: @color-text-secondary;
    }

    &--error strong,
    &--error p {
      color: @color-danger;
    }
  }

  &__primary-link,
  .interview-card__action {
    min-height: 36px;
    padding: 0 @space-lg;
    border-radius: @radius-md;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: @font-size-md;
    font-weight: 650;
    white-space: nowrap;
    transition:
      transform @transition-fast,
      filter @transition-fast;

    &:hover {
      color: @color-text-inverse;
      filter: brightness(1.04);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(1px);
    }

    &:focus-visible {
      outline: 2px solid @color-primary-hover;
      outline-offset: 3px;
    }
  }

  &__primary-link {
    margin-top: @space-sm;
    background: linear-gradient(180deg, @color-primary, @color-primary-hover);
    color: @color-text-inverse;
    box-shadow: @shadow-sm;
  }
}

.interview-card {
  min-height: 228px;
  padding: @space-xl;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  .workspace-surface();
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: @space-xl;
  box-shadow: @shadow-sm;

  &__company {
    color: @color-primary-hover;
    font-size: @font-size-sm;
    font-weight: 650;
  }

  h3 {
    margin-top: @space-xs;
    font-size: @font-size-xl;
  }

  dl {
    margin-top: @space-xl;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: @space-xl;
  }

  dt {
    margin-bottom: @space-xs;
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }

  dd {
    color: @color-text;
    font-variant-numeric: tabular-nums;
  }

  &__action {
    align-self: flex-end;
    background: linear-gradient(180deg, @color-primary, @color-primary-hover);
    color: @color-text-inverse;
  }

  &--skeleton {
    justify-content: center;

    span {
      width: 72%;
      height: 14px;
      border-radius: @radius-sm;
      background: @color-bg;

      &:nth-child(2) {
        width: 46%;
      }

      &:nth-child(3) {
        width: 88%;
      }
    }
  }
}

@media (max-width: 760px) {
  .interview-overview {
    &__summary {
      grid-template-columns: 1fr;
    }

    &__grid {
      grid-template-columns: 1fr;
    }

    &__state {
      min-height: 200px;
      padding: @space-xl;
    }
  }

  .interview-card {
    min-height: 0;

    dl {
      gap: @space-md;
    }
  }
}
</style>
