<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { useInterviewPrepStore } from '../store'
import type { RoundLabel } from '../types'

const route = useRoute()
const store = useInterviewPrepStore()
const jobPostId = computed(() => String(route.params.jobPostId))
const currentProject = computed(() =>
  store.projects.find((project) => project.jobPostId === jobPostId.value),
)
const saving = ref(false)
const saveError = ref('')
const form = reactive({
  roundLabel: '初面' as RoundLabel,
  customRound: '',
  questionText: '',
})
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function resolvedRound(roundLabel: RoundLabel, customRound: string | null): string {
  return roundLabel === '其他' ? customRound || '其他' : roundLabel
}

async function saveQuestion() {
  const questionText = form.questionText.trim()
  if (!questionText || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    await store.createReviewQuestion(jobPostId.value, {
      roundLabel: form.roundLabel,
      customRound: form.roundLabel === '其他' ? form.customRound.trim() || null : null,
      questionText,
    })
    form.questionText = ''
  } catch (error) {
    saveError.value = (error as Error).message || '问题保存失败，请重试。'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      store.loadReviewProjects(),
      store.loadReviewQuestions(jobPostId.value),
    ])
  } catch {
    // The store exposes a contextual load error below.
  }
})
</script>

<template>
  <section class="question-review">
    <RouterLink class="question-review__back" :to="{ name: 'interview-overview' }">
      返回面试复盘
    </RouterLink>

    <div v-if="store.reviewError && !currentProject" class="question-review__state question-review__state--error">
      <strong>岗位面试记录加载失败</strong>
      <p>{{ store.reviewError }}</p>
    </div>

    <div v-else-if="store.reviewLoading && !currentProject" class="question-review__state">
      正在加载面试记录...
    </div>

    <div v-else-if="!currentProject" class="question-review__state">
      <strong>未找到这个岗位</strong>
      <p>岗位可能已被删除，请返回面试复盘重新选择。</p>
    </div>

    <template v-else>
      <header class="question-review__head">
        <p>{{ currentProject.companyName }}</p>
        <h2>{{ currentProject.jobTitle }}</h2>
      </header>

      <div class="question-review__layout">
        <form class="question-form" @submit.prevent="saveQuestion">
          <header>
            <h3>记录面试问题</h3>
            <p>保存本轮面试中真实出现的问题。</p>
          </header>

          <label>
            <span>面试轮次</span>
            <select v-model="form.roundLabel">
              <option>初面</option>
              <option>复面</option>
              <option>终面</option>
              <option>HR 面</option>
              <option>笔试</option>
              <option>其他</option>
            </select>
          </label>

          <label v-if="form.roundLabel === '其他'">
            <span>自定义轮次</span>
            <BaseInput v-model="form.customRound" placeholder="例如 技术加面" />
          </label>

          <label>
            <span>问题内容</span>
            <textarea
              v-model="form.questionText"
              rows="6"
              required
              placeholder="输入面试官提出的问题"
            />
          </label>

          <p v-if="saveError" class="question-form__error" role="alert">{{ saveError }}</p>
          <BaseButton type="submit" :loading="saving" :disabled="!form.questionText.trim()" block>
            保存问题
          </BaseButton>
        </form>

        <section class="question-history" aria-labelledby="question-history-title">
          <header>
            <div>
              <h3 id="question-history-title">历史问题</h3>
              <p>{{ store.reviewQuestions.length }} 条记录</p>
            </div>
          </header>

          <div v-if="store.reviewLoading && store.reviewQuestions.length === 0" class="question-history__state">
            正在加载问题...
          </div>
          <div v-else-if="store.reviewQuestions.length === 0" class="question-history__state">
            还没有记录面试问题
          </div>
          <div v-else class="question-history__list">
            <article v-for="question in store.reviewQuestions" :key="question.id" class="question-item">
              <div class="question-item__meta">
                <strong>{{ resolvedRound(question.roundLabel, question.customRound) }}</strong>
                <time :datetime="question.createdAt">{{ dateFormatter.format(new Date(question.createdAt)) }}</time>
              </div>
              <p>{{ question.questionText }}</p>
            </article>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<style lang="less" scoped>
.question-review {
  display: flex;
  flex-direction: column;
  gap: @space-xl;

  &__back {
    align-self: flex-start;
    color: @color-text-secondary;
    font-size: @font-size-sm;
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 4px;

    &:hover {
      color: @color-primary-hover;
      text-decoration-color: currentColor;
    }

    &:focus-visible {
      outline: 2px solid @color-primary-hover;
      outline-offset: 4px;
    }
  }

  &__head {
    p {
      color: @color-primary-hover;
      font-size: @font-size-sm;
      font-weight: 650;
    }

    h2 {
      margin-top: @space-xs;
      font-size: @font-size-xxl;
    }
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
    align-items: start;
    gap: @space-lg;
  }

  &__state {
    min-height: 220px;
    padding: @space-xxl;
    border: 1px solid @color-border;
    border-radius: @radius-md;
    background: @color-bg-elevated;
    display: flex;
    justify-content: center;
    flex-direction: column;
    gap: @space-sm;
    color: @color-text-secondary;

    strong {
      color: @color-text;
    }

    &--error strong,
    &--error p {
      color: @color-danger;
    }
  }
}

.question-form,
.question-history {
  border: 1px solid @color-border;
  border-radius: @radius-md;
  background: @color-bg-elevated;
}

.question-form {
  position: sticky;
  top: 96px;
  padding: @space-xl;
  display: flex;
  flex-direction: column;
  gap: @space-lg;
  box-shadow: @shadow-sm;

  header p,
  label span {
    color: @color-text-secondary;
  }

  header p {
    margin-top: @space-xs;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: @space-sm;
    font-size: @font-size-sm;
  }

  select,
  textarea {
    width: 100%;
    border: 1px solid @color-border-strong;
    border-radius: @radius-md;
    background: @color-bg;
    color: @color-text;
    font: inherit;
    transition:
      border-color @transition-fast,
      box-shadow @transition-fast;

    &:focus-visible {
      outline: none;
      border-color: @color-primary;
      box-shadow: 0 0 0 3px fade(@color-primary, 18%);
    }
  }

  select {
    min-height: 38px;
    padding: 0 @space-md;
  }

  textarea {
    padding: @space-md;
    line-height: 1.65;
    resize: vertical;

    &::placeholder {
      color: @color-text-disabled;
    }
  }

  &__error {
    color: @color-danger;
    font-size: @font-size-sm;
  }
}

.question-history {
  min-height: 360px;
  padding: @space-xl;

  > header {
    margin-bottom: @space-lg;

    p {
      margin-top: @space-xs;
      color: @color-text-secondary;
      font-size: @font-size-sm;
      font-variant-numeric: tabular-nums;
    }
  }

  &__state {
    min-height: 240px;
    display: grid;
    place-items: center;
    color: @color-text-secondary;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }
}

.question-item {
  padding: @space-lg 0;
  border-bottom: 1px solid @color-border;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  &__meta {
    margin-bottom: @space-sm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: @space-md;

    strong {
      color: @color-primary-hover;
      font-size: @font-size-sm;
    }

    time {
      color: @color-text-secondary;
      font-size: @font-size-sm;
      font-variant-numeric: tabular-nums;
    }
  }

  > p {
    max-width: 72ch;
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

@media (max-width: 760px) {
  .question-review__layout {
    grid-template-columns: 1fr;
  }

  .question-form {
    position: static;
  }

  .question-item__meta {
    align-items: flex-start;
    flex-direction: column;
    gap: @space-xs;
  }
}
</style>
