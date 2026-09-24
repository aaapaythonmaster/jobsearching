<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import { jobSearchApi } from '@/modules/job-search/api'
import { useJobSearchStore } from '@/modules/job-search/store'
import type { GreetingDraft, TailoredResume } from '@/modules/job-search/types'

const store = useJobSearchStore()
const job = computed(() => store.contextJob)
const mode = computed(() => store.contextMode)
const greetingDrafts = ref<GreetingDraft[]>([])
const tailoredResumes = ref<TailoredResume[]>([])
const selectedResumeId = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const copiedId = ref<string | null>(null)
const editingJd = ref(false)
const editingJdText = ref('')
const editingStatusId = ref('')

const emit = defineEmits<{ close: [] }>()

watch(job, (nextJob) => {
  editingJdText.value = nextJob?.jdText ?? ''
  editingStatusId.value = nextJob?.statusId ?? ''
  editingJd.value = false
}, { immediate: true })

const statusName = computed(() => {
  const statusMap = new Map(store.statuses.map((status) => [status.id, status.name]))
  return (statusId: string | null) => (statusId ? (statusMap.get(statusId) ?? '未设置') : '未设置')
})

onMounted(async () => {
  if (!job.value || mode.value === 'detail') return
  await loadContextData()
})

watch(mode, async (nextMode, previousMode) => {
  if (nextMode !== previousMode && nextMode !== 'detail') await loadContextData()
})

async function loadContextData() {
  if (!job.value) return
  loading.value = true
  error.value = null
  try {
    await store.fetchResumes()
    selectedResumeId.value ||= store.resumes[0]?.id ?? ''
    if (mode.value === 'greeting') {
      greetingDrafts.value = await jobSearchApi.listGreetingDrafts(job.value.id)
    } else if (mode.value === 'tailored') {
      tailoredResumes.value = await jobSearchApi.listTailoredResumes(job.value.id)
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function generateGreeting() {
  if (!job.value || !selectedResumeId.value) {
    error.value = '请先选择一份基础简历'
    return
  }
  loading.value = true
  error.value = null
  try {
    const draft = await jobSearchApi.generateGreeting({ jobPostId: job.value.id, resumeId: selectedResumeId.value })
    greetingDrafts.value = [draft, ...greetingDrafts.value]
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function generateTailoredResume() {
  if (!job.value || !selectedResumeId.value) {
    error.value = '请先选择一份基础简历'
    return
  }
  loading.value = true
  error.value = null
  try {
    const result = await jobSearchApi.generateTailoredResume({ jobPostId: job.value.id, resumeId: selectedResumeId.value })
    tailoredResumes.value = [result, ...tailoredResumes.value]
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function copy(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
  } catch {
    error.value = '复制失败，请手动选中文案复制'
  }
}

async function saveJd() {
  if (!job.value || !editingJdText.value.trim()) {
    error.value = 'JD 内容不能为空'
    return
  }
  loading.value = true
  error.value = null
  try {
    await store.updateJob(job.value.id, {
      jdText: editingJdText.value.trim(),
      statusId: editingStatusId.value || null,
    })
    editingJd.value = false
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function startEditing() {
  if (!job.value) return
  editingJdText.value = job.value.jdText ?? ''
  editingStatusId.value = job.value.statusId ?? ''
  editingJd.value = true
}

function cancelEditing() {
  if (!job.value) return
  editingJdText.value = job.value.jdText ?? ''
  editingStatusId.value = job.value.statusId ?? ''
  editingJd.value = false
}
</script>

<template>
  <aside v-if="job" class="job-context-panel" aria-label="岗位上下文">
    <header class="job-context-panel__header">
      <div>
        <span class="job-context-panel__kicker">JOB CONTEXT</span>
        <h2>{{ job.jobTitle }}</h2>
        <p>{{ job.companyName }} · {{ job.city || '城市未填' }}</p>
      </div>
      <BaseButton size="sm" variant="ghost" aria-label="关闭岗位上下文" @click="emit('close')">关闭</BaseButton>
    </header>

    <nav class="job-context-panel__tabs" aria-label="岗位操作">
      <button type="button" :class="{ 'is-active': mode === 'detail' }" @click="store.setJobContextMode('detail')">查看</button>
      <button type="button" :class="{ 'is-active': mode === 'greeting' }" @click="store.setJobContextMode('greeting')">打招呼</button>
      <button type="button" :class="{ 'is-active': mode === 'tailored' }" @click="store.setJobContextMode('tailored')">简历调整</button>
    </nav>

    <div v-if="error" class="job-context-panel__error">{{ error }}</div>

    <section v-if="mode === 'detail'" class="job-context-panel__section job-context-panel__section--detail">
      <dl>
        <div><dt>岗位方向</dt><dd>{{ job.jobDirection || '未设置' }}</dd></div>
        <div><dt>薪资</dt><dd>{{ job.salaryRange || '未填写' }}</dd></div>
        <div><dt>来源</dt><dd>{{ job.sourcePlatform || '未填写' }}</dd></div>
        <div>
          <dt>状态</dt>
          <dd v-if="!editingJd">{{ statusName(job.statusId) }}</dd>
          <dd v-else>
            <select v-model="editingStatusId" aria-label="编辑岗位状态">
              <option value="">未设置</option>
              <option v-for="status in store.statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
            </select>
          </dd>
        </div>
      </dl>
      <div class="job-context-panel__section-heading">
        <h3>JD 摘要</h3>
        <div class="job-context-panel__jd-actions">
          <BaseButton v-if="!editingJd" size="sm" variant="secondary" @click="startEditing">编辑</BaseButton>
          <template v-else>
            <BaseButton size="sm" :loading="loading" @click="saveJd">保存</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="cancelEditing">取消</BaseButton>
          </template>
        </div>
      </div>
      <textarea v-if="editingJd" v-model="editingJdText" class="job-context-panel__jd-editor" rows="12" aria-label="编辑岗位 JD" />
      <p v-else class="job-context-panel__jd">{{ job.jdText || '暂无 JD 原文' }}</p>
    </section>

    <section v-else-if="mode === 'greeting'" class="job-context-panel__section">
      <h3>HR 打招呼</h3>
      <p>选择基础简历后，在当前右栏生成并复制打招呼内容。</p>
      <label>基础简历<select v-model="selectedResumeId"><option value="">请选择基础简历</option><option v-for="resume in store.resumes" :key="resume.id" :value="resume.id">{{ resume.name }}</option></select></label>
      <BaseButton :loading="loading" :disabled="!store.resumes.length" @click="generateGreeting">生成打招呼</BaseButton>
      <article v-for="draft in greetingDrafts" :key="draft.id" class="job-context-panel__result"><p>{{ draft.content }}</p><BaseButton size="sm" variant="ghost" @click="copy(draft.content, draft.id)">{{ copiedId === draft.id ? '已复制' : '复制' }}</BaseButton></article>
      <div v-if="!loading && !greetingDrafts.length" class="job-context-panel__empty">还没有生成过打招呼内容</div>
    </section>

    <section v-else class="job-context-panel__section">
      <h3>简历调整</h3>
      <p>选择基础简历，生成针对当前岗位的调整建议。</p>
      <label>基础简历<select v-model="selectedResumeId"><option value="">请选择基础简历</option><option v-for="resume in store.resumes" :key="resume.id" :value="resume.id">{{ resume.name }}</option></select></label>
      <BaseButton :loading="loading" :disabled="!store.resumes.length" @click="generateTailoredResume">生成调整建议</BaseButton>
      <article v-for="result in tailoredResumes" :key="result.id" class="job-context-panel__result"><p>{{ result.content }}</p><BaseButton size="sm" variant="ghost" @click="copy(result.content, result.id)">{{ copiedId === result.id ? '已复制' : '复制' }}</BaseButton></article>
      <div v-if="!loading && !tailoredResumes.length" class="job-context-panel__empty">还没有生成过简历调整建议</div>
    </section>
  </aside>
</template>

<style lang="less" scoped>
.job-context-panel { display: flex; height: 100%; min-height: 0; flex-direction: column; overflow-y: auto; padding: @space-lg; background: @color-workspace-surface; }
.job-context-panel__header { display: flex; justify-content: space-between; gap: @space-md; padding-bottom: @space-md; border-bottom: 1px solid @color-border; h2 { margin-top: @space-xs; font-size: @font-size-xl; } p { margin-top: @space-xs; color: @color-text-secondary; } }
.job-context-panel__kicker { color: @color-primary; font-size: @font-size-sm; letter-spacing: .08em; text-transform: uppercase; }
.job-context-panel__tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: @space-md 0; padding: 4px; border-radius: @radius-md; background: @color-bg-muted; button { min-height: 34px; border: 0; border-radius: @radius-sm; background: transparent; color: @color-text-secondary; cursor: pointer; font: inherit; white-space: nowrap; &.is-active { background: @color-workspace-surface; color: @color-text; box-shadow: 0 1px 3px fade(#000, 8%); } } }
.job-context-panel__section { display: flex; flex-direction: column; gap: @space-md; h3 { font-size: @font-size-lg; } p { color: @color-text-secondary; line-height: 1.5; } label { display: flex; flex-direction: column; gap: @space-xs; color: @color-text-secondary; font-size: @font-size-sm; } select { width: 100%; border: 1px solid @color-border-strong; border-radius: @radius-md; padding: @space-sm; background: @color-bg; color: @color-text; font: inherit; } }
.job-context-panel__section--detail dd select { width: auto; min-width: 0; max-width: 100%; border: 1px solid @color-border-strong; border-radius: @radius-sm; padding: @space-xs @space-sm; background: @color-bg; color: @color-text; font: inherit; }
.job-context-panel__section--detail { flex: 1; min-height: 0; }
.job-context-panel__section-heading { display: flex; align-items: center; justify-content: space-between; gap: @space-sm; }
.job-context-panel__jd-actions { display: flex; gap: @space-xs; }
.job-context-panel__section dl { display: grid; gap: @space-sm; margin: 0; div { display: flex; justify-content: space-between; gap: @space-md; } dt { color: @color-text-secondary; } dd { margin: 0; color: @color-text; text-align: right; } }
.job-context-panel__jd { flex: 1; min-height: 180px; overflow-y: auto; margin: 0; padding: @space-md; border-radius: @radius-md; background: @color-bg-muted; white-space: pre-wrap; }
.job-context-panel__jd-editor { flex: 1; min-height: 180px; width: 100%; resize: vertical; border: 1px solid @color-border-strong; border-radius: @radius-md; padding: @space-md; background: @color-bg; color: @color-text; font: inherit; line-height: 1.5; }
.job-context-panel__result { display: flex; flex-direction: column; gap: @space-sm; padding: @space-md; border: 1px solid @color-border; border-radius: @radius-md; background: @color-bg; p { white-space: pre-wrap; } }
.job-context-panel__error { margin: @space-md 0; padding: @space-sm @space-md; border-radius: @radius-md; background: fade(@color-danger, 10%); color: @color-danger; }
.job-context-panel__empty { padding: @space-lg 0; color: @color-text-disabled; text-align: center; }
</style>
