<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { jobSearchApi } from '../api'
import { useJobSearchStore } from '../store'
import type { GreetingDraft, JobPost, JobPostUpdateInput, TailoredResume } from '../types'

const route = useRoute()
const router = useRouter()
const store = useJobSearchStore()
const loading = ref(false)
const error = ref<string | null>(null)
const job = ref<JobPost | null>(null)
const greetingDrafts = ref<GreetingDraft[]>([])
const greetingLoading = ref(false)
const greetingError = ref<string | null>(null)
const copiedDraftId = ref<string | null>(null)
const tailoredResumes = ref<TailoredResume[]>([])
const selectedResumeId = ref('')
const tailoredLoading = ref(false)
const tailoredError = ref<string | null>(null)
const copiedTailoredId = ref<string | null>(null)
const form = reactive<JobPostUpdateInput>({
  companyName: '',
  jobTitle: '',
  jobDirection: '',
  city: '',
  salaryRange: '',
  sourcePlatform: '',
  jdText: '',
  statusId: null,
  notes: '',
})

onMounted(async () => {
  await Promise.all([store.fetchStatuses(), store.fetchResumes(), load()])
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const jobId = String(route.params.id)
    const [nextJob, drafts, tailored] = await Promise.all([
      jobSearchApi.getJob(jobId),
      jobSearchApi.listGreetingDrafts(jobId),
      jobSearchApi.listTailoredResumes(jobId),
    ])
    job.value = nextJob
    greetingDrafts.value = drafts
    tailoredResumes.value = tailored
    fillForm(nextJob)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function fillForm(next: JobPost) {
  form.companyName = next.companyName
  form.jobTitle = next.jobTitle
  form.jobDirection = next.jobDirection
  form.city = next.city
  form.salaryRange = next.salaryRange
  form.sourcePlatform = next.sourcePlatform
  form.jdText = next.jdText
  form.statusId = next.statusId
  form.notes = next.notes
}

async function save() {
  if (!job.value) return
  job.value = await store.updateJob(job.value.id, {
    companyName: form.companyName?.trim(),
    jobTitle: form.jobTitle?.trim(),
    jobDirection: form.jobDirection?.trim(),
    city: form.city?.trim() || null,
    salaryRange: form.salaryRange?.trim() || null,
    sourcePlatform: form.sourcePlatform?.trim() || null,
    jdText: form.jdText?.trim(),
    statusId: form.statusId || null,
    notes: form.notes?.trim() || null,
  })
  fillForm(job.value)
}

async function generateGreeting() {
  if (!job.value) return
  greetingLoading.value = true
  greetingError.value = null
  try {
    const draft = await jobSearchApi.generateGreeting({ jobPostId: job.value.id })
    greetingDrafts.value = [draft, ...greetingDrafts.value]
    copiedDraftId.value = null
  } catch (e) {
    greetingError.value = (e as Error).message
  } finally {
    greetingLoading.value = false
  }
}

async function copyGreeting(draft: GreetingDraft) {
  greetingError.value = null
  try {
    await navigator.clipboard.writeText(draft.content)
    copiedDraftId.value = draft.id
  } catch {
    greetingError.value = '复制失败，请手动选中文案复制'
  }
}

async function generateTailoredResume() {
  if (!job.value) return
  if (!selectedResumeId.value) {
    tailoredError.value = '请先选择一份基础简历'
    return
  }
  tailoredLoading.value = true
  tailoredError.value = null
  try {
    const result = await jobSearchApi.generateTailoredResume({
      jobPostId: job.value.id,
      resumeId: selectedResumeId.value,
    })
    tailoredResumes.value = [result, ...tailoredResumes.value]
    copiedTailoredId.value = null
  } catch (e) {
    tailoredError.value = (e as Error).message
  } finally {
    tailoredLoading.value = false
  }
}

async function copyTailoredResume(result: TailoredResume, part: 'content' | 'notes') {
  tailoredError.value = null
  const text =
    part === 'content'
      ? result.content
      : ['修改说明：', result.changeNotes, '', '风险提醒：', result.riskNotes].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    copiedTailoredId.value = `${result.id}:${part}`
  } catch {
    tailoredError.value = '复制失败，请手动选中文案复制'
  }
}
</script>

<template>
  <section class="detail-page">
    <BaseButton variant="ghost" @click="router.back()">&lsaquo; 返回</BaseButton>
    <div v-if="loading" class="state">加载中...</div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>
    <form v-else-if="job" class="panel" @submit.prevent="save">
      <header>
        <h2>{{ job.jobTitle }}</h2>
        <p>{{ job.companyName }}</p>
      </header>
      <div class="detail-page__grid">
        <label>公司<BaseInput v-model="form.companyName" /></label>
        <label>岗位<BaseInput v-model="form.jobTitle" /></label>
        <label>方向<BaseInput v-model="form.jobDirection" /></label>
        <label>城市<BaseInput v-model="form.city" /></label>
        <label>薪资<BaseInput v-model="form.salaryRange" /></label>
        <label>平台<BaseInput v-model="form.sourcePlatform" /></label>
      </div>
      <label>
        状态
        <select v-model="form.statusId">
          <option :value="null">未设置</option>
          <option v-for="status in store.statuses" :key="status.id" :value="status.id">
            {{ status.name }}
          </option>
        </select>
      </label>
      <label>JD 原文<textarea v-model="form.jdText" rows="14" /></label>
      <label>备注<textarea v-model="form.notes" rows="4" /></label>
      <BaseButton type="submit" :loading="store.loading">保存修改</BaseButton>
    </form>
    <section v-if="job" class="panel greeting-panel">
      <header class="greeting-panel__header">
        <div>
          <h3>HR 打招呼内容</h3>
          <p>基于当前 JD 生成，生成结果会保留为历史草稿。</p>
        </div>
        <BaseButton type="button" :loading="greetingLoading" @click="generateGreeting">
          生成打招呼
        </BaseButton>
      </header>
      <p v-if="greetingError" class="state state--error">{{ greetingError }}</p>
      <div v-if="greetingDrafts.length" class="greeting-list">
        <article v-for="draft in greetingDrafts" :key="draft.id" class="greeting-item">
          <p>{{ draft.content }}</p>
          <footer>
            <span>{{ new Date(draft.createdAt).toLocaleString('zh-CN') }}</span>
            <BaseButton type="button" variant="ghost" @click="copyGreeting(draft)">
              {{ copiedDraftId === draft.id ? '已复制' : '复制' }}
            </BaseButton>
          </footer>
        </article>
      </div>
      <div v-else class="state">还没有生成过打招呼内容</div>
    </section>
    <section v-if="job" class="panel tailored-panel">
      <header class="greeting-panel__header">
        <div>
          <h3>调整版简历</h3>
          <p>选择一份基础简历，基于当前 JD 生成投递版本，原始简历不会被修改。</p>
        </div>
        <BaseButton
          type="button"
          :disabled="!store.resumes.length"
          :loading="tailoredLoading"
          @click="generateTailoredResume"
        >
          生成简历
        </BaseButton>
      </header>
      <label>
        基础简历
        <select v-model="selectedResumeId">
          <option value="">请选择基础简历</option>
          <option v-for="resume in store.resumes" :key="resume.id" :value="resume.id">
            {{ resume.name }}{{ resume.targetRole ? ` / ${resume.targetRole}` : '' }}
          </option>
        </select>
      </label>
      <p v-if="tailoredError" class="state state--error">{{ tailoredError }}</p>
      <div v-if="!store.resumes.length" class="state">还没有基础简历，请先在简历页上传 Word 或 PDF</div>
      <div v-else-if="tailoredResumes.length" class="tailored-list">
        <article v-for="result in tailoredResumes" :key="result.id" class="tailored-item">
          <header>
            <div>
              <strong>{{ result.resumeSnapshot.name }}</strong>
              <span>{{ new Date(result.createdAt).toLocaleString('zh-CN') }}</span>
            </div>
            <div class="tailored-item__actions">
              <BaseButton type="button" variant="ghost" @click="copyTailoredResume(result, 'content')">
                {{ copiedTailoredId === `${result.id}:content` ? '已复制' : '复制简历' }}
              </BaseButton>
              <BaseButton type="button" variant="ghost" @click="copyTailoredResume(result, 'notes')">
                {{ copiedTailoredId === `${result.id}:notes` ? '已复制' : '复制说明' }}
              </BaseButton>
            </div>
          </header>
          <section>
            <h4>简历正文</h4>
            <pre>{{ result.content }}</pre>
          </section>
          <section class="tailored-item__notes">
            <h4>修改说明</h4>
            <p>{{ result.changeNotes }}</p>
          </section>
          <section class="tailored-item__notes">
            <h4>风险提醒</h4>
            <p>{{ result.riskNotes }}</p>
          </section>
        </article>
      </div>
      <div v-else class="state">还没有生成过调整版简历</div>
    </section>
  </section>
</template>

<style lang="less" scoped>
.detail-page {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: @space-lg;

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: @space-md;
  }
}

.panel {
  background: @color-bg-elevated;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-lg;
  display: flex;
  flex-direction: column;
  gap: @space-md;

  h2 {
    font-size: @font-size-xxl;
  }

  p {
    color: @color-text-secondary;
  }

  h3 {
    font-size: @font-size-xl;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: @space-xs;
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }
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

.greeting-panel {
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: @space-md;

    p {
      margin-top: @space-xs;
    }
  }
}

.greeting-list {
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.greeting-item,
.tailored-item {
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;
  background: @color-bg;

  p {
    color: @color-text;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  footer {
    margin-top: @space-md;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: @space-md;
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }
}

.tailored-list {
  display: flex;
  flex-direction: column;
  gap: @space-lg;
}

.tailored-item {
  display: flex;
  flex-direction: column;
  gap: @space-md;

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: @space-md;

    div:first-child {
      display: flex;
      flex-direction: column;
      gap: @space-xs;
    }

    span {
      color: @color-text-secondary;
      font-size: @font-size-sm;
    }
  }

  h4 {
    margin-bottom: @space-xs;
    font-size: @font-size-md;
  }

  pre {
    max-height: 420px;
    overflow: auto;
    border: 1px solid @color-border;
    border-radius: @radius-md;
    padding: @space-md;
    background: @color-bg-elevated;
    color: @color-text;
    font: inherit;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: @space-sm;
    justify-content: flex-end;
  }

  &__notes {
    p {
      color: @color-text;
      line-height: 1.7;
      white-space: pre-wrap;
    }
  }
}

.state {
  padding: @space-xl;
  text-align: center;
  color: @color-text-secondary;

  &--error {
    color: @color-danger;
  }
}

@media (max-width: 720px) {
  .detail-page__grid {
    grid-template-columns: 1fr;
  }

  .greeting-panel__header,
  .greeting-item footer,
  .tailored-item > header {
    align-items: stretch;
    flex-direction: column;
  }

  .tailored-item__actions {
    justify-content: flex-start;
  }
}
</style>
