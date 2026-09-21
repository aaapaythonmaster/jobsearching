<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { interviewPrepApi } from '../api'
import { useInterviewPrepStore } from '../store'
import type { IntroDuration, InterviewQuestion, RoundLabel } from '../types'

const route = useRoute()
const router = useRouter()
const store = useInterviewPrepStore()
const jobPostId = computed(() => String(route.params.jobPostId))
const selectedResumeId = ref('')
const questionLoading = ref(false)
const generationLoading = ref('')
const selectedQuestionIds = ref<string[]>([])
const answerVersions = ref<Record<string, string>>({})
const copiedId = ref('')

const questionForm = reactive({
  roundLabel: '初面' as RoundLabel,
  customRound: '',
  questionText: '',
  userAnswer: '',
  notes: '',
})

const introForm = reactive({
  durationLabel: '3 分钟' as IntroDuration,
  customDurationMinutes: 3,
})

const currentResumeId = computed(() => selectedResumeId.value || store.summary?.binding?.resumeId || '')
const summaryFaqs = computed(() => store.summary?.faqs.filter((faq) => faq.type === 'summary') ?? [])
const deepFaqs = computed(() => store.summary?.faqs.filter((faq) => faq.type === 'deep') ?? [])

onMounted(async () => {
  await store.load(jobPostId.value)
  selectedResumeId.value = store.summary?.binding?.resumeId ?? ''
})

async function bindResume() {
  if (!selectedResumeId.value) return
  await store.bindResume(jobPostId.value, selectedResumeId.value)
}

async function createQuestion() {
  const questionText = questionForm.questionText.trim()
  if (!questionText) return
  questionLoading.value = true
  try {
    await store.createQuestion(jobPostId.value, {
      roundLabel: questionForm.roundLabel,
      customRound: questionForm.roundLabel === '其他' ? questionForm.customRound.trim() || null : null,
      questionText,
      userAnswer: questionForm.userAnswer.trim() || null,
      notes: questionForm.notes.trim() || null,
    })
    questionForm.questionText = ''
    questionForm.userAnswer = ''
    questionForm.notes = ''
  } finally {
    questionLoading.value = false
  }
}

async function reviewAnswer(question: InterviewQuestion) {
  generationLoading.value = `answer:${question.id}`
  try {
    const result = await interviewPrepApi.reviewAnswer(question.id, question.userAnswer)
    answerVersions.value[question.id] = [
      '回答分析：',
      result.analysis,
      '',
      '参考回答：',
      result.referenceAnswer,
    ].join('\n')
  } finally {
    generationLoading.value = ''
  }
}

async function generateIntro() {
  if (!currentResumeId.value) return
  generationLoading.value = 'intro'
  try {
    const intro = await interviewPrepApi.generateIntro(jobPostId.value, {
      resumeId: currentResumeId.value,
      durationLabel: introForm.durationLabel,
      customDurationMinutes:
        introForm.durationLabel === '自定义' ? Number(introForm.customDurationMinutes) : null,
    })
    if (store.summary) store.summary.intros = [intro, ...store.summary.intros]
  } finally {
    generationLoading.value = ''
  }
}

async function generateSummaryFaq() {
  if (!selectedQuestionIds.value.length) return
  generationLoading.value = 'summary-faq'
  try {
    const faq = await interviewPrepApi.generateSummaryFaq(jobPostId.value, {
      questionIds: selectedQuestionIds.value,
      resumeId: currentResumeId.value || undefined,
    })
    store.addFaq(faq)
  } finally {
    generationLoading.value = ''
  }
}

async function generateDeepFaq() {
  if (!currentResumeId.value) return
  generationLoading.value = 'deep-faq'
  try {
    const faq = await interviewPrepApi.generateDeepFaq(jobPostId.value, {
      resumeId: currentResumeId.value,
    })
    store.addFaq(faq)
  } finally {
    generationLoading.value = ''
  }
}

async function copyText(id: string, text: string) {
  await navigator.clipboard.writeText(text)
  copiedId.value = id
}
</script>

<template>
  <section class="interview-page">
    <BaseButton variant="ghost" @click="router.back()">&lsaquo; 返回岗位详情</BaseButton>
    <div v-if="store.loading && !store.summary" class="state">加载中...</div>
    <div v-else-if="store.error" class="state state--error">{{ store.error }}</div>
    <template v-else-if="store.summary">
      <header class="page-head">
        <div>
          <h2>面试准备</h2>
          <p>
            {{ store.summary.jobPost.companyName }} / {{ store.summary.jobPost.jobTitle }}
          </p>
        </div>
      </header>

      <section class="panel">
        <header class="panel-head">
          <div>
            <h3>绑定基础简历</h3>
            <p>用于生成自我介绍、参考回答和岗位深挖 FAQ。</p>
          </div>
          <BaseButton type="button" :disabled="!selectedResumeId" @click="bindResume">保存绑定</BaseButton>
        </header>
        <select v-model="selectedResumeId">
          <option value="">请选择基础简历</option>
          <option v-for="resume in store.summary.resumeOptions" :key="resume.id" :value="resume.id">
            {{ resume.name }}{{ resume.targetRole ? ` / ${resume.targetRole}` : '' }}
          </option>
        </select>
      </section>

      <section class="panel">
        <h3>录入真实面试问题</h3>
        <div class="question-form">
          <label>
            轮次
            <select v-model="questionForm.roundLabel">
              <option>初面</option>
              <option>复面</option>
              <option>终面</option>
              <option>HR 面</option>
              <option>笔试</option>
              <option>其他</option>
            </select>
          </label>
          <label v-if="questionForm.roundLabel === '其他'">
            自定义轮次
            <BaseInput v-model="questionForm.customRound" />
          </label>
        </div>
        <label>问题<textarea v-model="questionForm.questionText" rows="3" /></label>
        <label>我的回答<textarea v-model="questionForm.userAnswer" rows="4" /></label>
        <label>备注<textarea v-model="questionForm.notes" rows="2" /></label>
        <BaseButton type="button" :loading="questionLoading" @click="createQuestion">保存问题</BaseButton>
      </section>

      <section class="panel">
        <header class="panel-head">
          <div>
            <h3>问题与回答分析</h3>
            <p>勾选问题可以生成总结 FAQ。</p>
          </div>
          <BaseButton
            type="button"
            :disabled="!selectedQuestionIds.length"
            :loading="generationLoading === 'summary-faq'"
            @click="generateSummaryFaq"
          >
            生成总结 FAQ
          </BaseButton>
        </header>
        <div v-if="!store.summary.questions.length" class="state">还没有录入问题</div>
        <article v-for="question in store.summary.questions" :key="question.id" class="question-card">
          <header>
            <label class="check-line">
              <input v-model="selectedQuestionIds" type="checkbox" :value="question.id" />
              <strong>{{ question.roundLabel === '其他' ? question.customRound : question.roundLabel }}</strong>
            </label>
            <BaseButton
              type="button"
              variant="ghost"
              :loading="generationLoading === `answer:${question.id}`"
              @click="reviewAnswer(question)"
            >
              分析并生成参考回答
            </BaseButton>
          </header>
          <p>{{ question.questionText }}</p>
          <pre v-if="question.userAnswer">我的回答：{{ question.userAnswer }}</pre>
          <pre v-if="answerVersions[question.id]">{{ answerVersions[question.id] }}</pre>
        </article>
      </section>

      <section class="panel">
        <header class="panel-head">
          <div>
            <h3>自我介绍</h3>
            <p>基于当前岗位 JD 和绑定简历生成。</p>
          </div>
          <BaseButton
            type="button"
            :disabled="!currentResumeId"
            :loading="generationLoading === 'intro'"
            @click="generateIntro"
          >
            生成自我介绍
          </BaseButton>
        </header>
        <div class="question-form">
          <label>
            时长
            <select v-model="introForm.durationLabel">
              <option>2 分钟</option>
              <option>3 分钟</option>
              <option>5 分钟</option>
              <option>自定义</option>
            </select>
          </label>
          <label v-if="introForm.durationLabel === '自定义'">
            分钟数
            <BaseInput v-model="introForm.customDurationMinutes" type="number" />
          </label>
        </div>
        <article v-for="intro in store.summary.intros" :key="intro.id" class="result-card">
          <header>
            <strong>{{ intro.durationLabel }}</strong>
            <BaseButton type="button" variant="ghost" @click="copyText(intro.id, intro.content)">
              {{ copiedId === intro.id ? '已复制' : '复制' }}
            </BaseButton>
          </header>
          <pre>{{ intro.content }}</pre>
        </article>
      </section>

      <section class="panel">
        <header class="panel-head">
          <div>
            <h3>岗位深挖 FAQ</h3>
            <p>基于 JD 和绑定简历生成可能被追问的问题。</p>
          </div>
          <BaseButton
            type="button"
            :disabled="!currentResumeId"
            :loading="generationLoading === 'deep-faq'"
            @click="generateDeepFaq"
          >
            生成深挖 FAQ
          </BaseButton>
        </header>
        <div class="faq-grid">
          <article v-for="faq in [...deepFaqs, ...summaryFaqs]" :key="faq.id" class="result-card">
            <h4>{{ faq.title }}</h4>
            <section v-for="item in faq.items" :key="`${faq.id}:${item.question}`" class="faq-item">
              <strong>{{ item.question }}</strong>
              <p>{{ item.scenario }}</p>
              <p>{{ item.answerApproach }}</p>
              <pre>{{ item.referenceAnswer }}</pre>
            </section>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<style lang="less" scoped>
.interview-page {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: @space-lg;
}

.page-head,
.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: @space-md;

  p {
    color: @color-text-secondary;
    margin-top: @space-xs;
  }
}

.panel {
    .workspace-surface();
  padding: @space-lg;
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.question-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: @space-md;
}

label {
  display: flex;
  flex-direction: column;
  gap: @space-xs;
  color: @color-text-secondary;
  font-size: @font-size-sm;
}

select,
textarea {
  width: 100%;
  border: 1px solid @color-border-strong;
  border-radius: @radius-md;
  padding: @space-sm @space-md;
  background: @color-bg;
  color: @color-text;
  font: inherit;
}

textarea {
  resize: vertical;
}

.question-card,
.result-card {
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;
  background: @color-bg;

  header {
    display: flex;
    justify-content: space-between;
    gap: @space-md;
    align-items: center;
    margin-bottom: @space-sm;
  }

  pre {
    white-space: pre-wrap;
    line-height: 1.7;
    color: @color-text;
  }
}

.check-line {
  flex-direction: row;
  align-items: center;
  color: @color-text;
}

.faq-grid {
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.faq-item {
  display: flex;
  flex-direction: column;
  gap: @space-xs;
  padding-top: @space-md;

  p {
    color: @color-text-secondary;
  }
}

.state {
  padding: @space-lg;
  text-align: center;
  color: @color-text-secondary;

  &--error {
    color: @color-danger;
  }
}

@media (max-width: 720px) {
  .page-head,
  .panel-head {
    flex-direction: column;
  }

  .question-form {
    grid-template-columns: 1fr;
  }
}
</style>
