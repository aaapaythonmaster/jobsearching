<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseEmpty from '@/components/BaseEmpty/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { jobSearchApi } from '../api'
import JobDraftReview from '../components/JobDraftReview.vue'
import JobImageQueue from '../components/JobImageQueue.vue'
import { useJobImageQueue } from '../composables/useJobImageQueue'
import { useJobSearchStore } from '../store'
import type { JobPostCreateInput, RejectedJobImage } from '../types'

const store = useJobSearchStore()
const router = useRouter()
const keyword = ref('')
const statusId = ref('')
const jobDirection = ref('')
const uploadError = ref<string | null>(null)

const queue = useJobImageQueue({
  extract: jobSearchApi.extractJobImage,
  parse: (jdText) => jobSearchApi.parseJob({ jdText }),
})

const statusName = computed(() => {
  const map = new Map(store.statuses.map((item) => [item.id, item.name]))
  return (id: string | null) => (id ? map.get(id) ?? '未知状态' : '未设置')
})

onMounted(async () => {
  await Promise.all([store.fetchStatuses(), store.fetchJobs()])
})

function clean(input: JobPostCreateInput): JobPostCreateInput {
  return {
    companyName: input.companyName.trim(),
    jobTitle: input.jobTitle.trim(),
    jobDirection: input.jobDirection.trim(),
    city: input.city?.trim() || undefined,
    salaryRange: input.salaryRange?.trim() || undefined,
    sourcePlatform: input.sourcePlatform?.trim() || undefined,
    jobUrl: input.jobUrl?.trim() || undefined,
    jdText: input.jdText.trim(),
    statusId: input.statusId || undefined,
    notes: input.notes?.trim() || undefined,
  }
}

function addScreenshots(files: File[]) {
  const result = queue.addFiles(files)
  const messages: string[] = []
  if (result.selectionError) messages.push(result.selectionError)
  if (result.rejected.length > 0) messages.push(formatRejected(result.rejected))
  uploadError.value = messages.length > 0 ? messages.join('；') : null
}

function formatRejected(rejected: RejectedJobImage[]) {
  return rejected
    .map((item) => `${item.fileName}（${item.reason === 'too_large' ? '超过 8MB' : '不是图片'}）`)
    .join('、')
}

async function saveDraft(draft: JobPostCreateInput) {
  const task = queue.activeTask.value
  if (!task) return
  queue.updateDraft(task.id, draft)
  queue.markSaving(task.id)
  try {
    await store.createJob(clean(draft))
    queue.markSaved(task.id)
  } catch (error) {
    queue.markSaveFailed(task.id, (error as Error).message)
  }
}

async function search() {
  await store.fetchJobs({
    keyword: keyword.value.trim() || undefined,
    statusId: statusId.value || undefined,
    jobDirection: jobDirection.value.trim() || undefined,
  })
}

async function removeJob(id: string) {
  if (!window.confirm('确认删除这个岗位吗？')) return
  await store.removeJob(id)
}
</script>

<template>
  <section class="job-page">
    <header class="job-page__header">
      <div>
        <h2>岗位 JD</h2>
        <p>批量识别岗位截图，逐条检查后保存并记录进展。</p>
      </div>
    </header>

    <section class="panel job-create">
      <header class="job-create__header">
        <h3>新增岗位</h3>
        <p>每张截图对应一个岗位；单次最多 10 张，同时识别 2 张。</p>
      </header>
      <p v-if="uploadError" class="job-create__error">{{ uploadError }}</p>
      <div class="job-create__workspace">
        <JobImageQueue
          :tasks="queue.tasks.value"
          :selected-task-id="queue.selectedTaskId.value"
          :processing="queue.processing.value"
          @files="addScreenshots"
          @select="queue.selectTask"
          @retry="queue.retryTask"
          @remove="queue.removeTask"
        />
        <JobDraftReview
          :task="queue.activeTask.value"
          :statuses="store.statuses"
          @update:draft="(draft) => queue.activeTask.value && queue.updateDraft(queue.activeTask.value.id, draft)"
          @save="saveDraft"
          @skip="queue.selectNextReady"
          @retry="queue.retryTask"
          @remove="queue.removeTask"
        />
      </div>
    </section>

    <section class="panel">
      <div class="job-page__filters">
        <BaseInput v-model="keyword" placeholder="搜索公司、岗位、JD" @enter="search" />
        <BaseInput v-model="jobDirection" placeholder="岗位方向" @enter="search" />
        <select v-model="statusId">
          <option value="">全部状态</option>
          <option v-for="status in store.statuses" :key="status.id" :value="status.id">
            {{ status.name }}
          </option>
        </select>
        <BaseButton variant="secondary" @click="search">筛选</BaseButton>
      </div>

      <div v-if="store.error" class="state state--error">{{ store.error }}</div>
      <div v-else-if="store.loading && store.jobs.length === 0" class="state">加载中...</div>
      <BaseEmpty v-else-if="store.jobs.length === 0" description="暂无岗位" />
      <div v-else class="job-list">
        <article v-for="job in store.jobs" :key="job.id" class="job-card">
          <div>
            <h3>{{ job.jobTitle }}</h3>
            <p>{{ job.companyName }} · {{ job.jobDirection }} · {{ job.city || '城市未填' }}</p>
            <p>{{ statusName(job.statusId) }} · {{ job.salaryRange || '薪资未填' }}</p>
          </div>
          <div class="job-card__actions">
            <BaseButton size="sm" @click="router.push({ name: 'job-search-job-detail', params: { id: job.id } })">
              查看
            </BaseButton>
            <BaseButton size="sm" variant="danger" @click="removeJob(job.id)">删除</BaseButton>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style lang="less" scoped>
.job-page {
  display: flex;
  flex-direction: column;
  gap: @space-lg;

  &__header h2 {
    font-size: @font-size-xxl;
    margin-bottom: @space-xs;
  }

  &__header p {
    color: @color-text-secondary;
  }

  &__filters {
    display: grid;
    grid-template-columns: 1fr 180px 180px auto;
    gap: @space-md;
    align-items: center;
    margin-bottom: @space-lg;
  }
}

.panel {
  background: @color-bg-elevated;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-lg;

  h3 {
    font-size: @font-size-lg;
  }
}

.job-create {
  display: flex;
  flex-direction: column;
  gap: @space-md;

  &__header p {
    margin-top: @space-xs;
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }

  &__error {
    border-radius: @radius-md;
    padding: @space-sm @space-md;
    background: fade(@color-danger, 8%);
    color: @color-danger;
    font-size: @font-size-sm;
  }

  &__workspace {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: @space-lg;
  }
}

select {
  width: 100%;
  border: 1px solid @color-border-strong;
  border-radius: @radius-md;
  padding: @space-sm @space-md;
  background: @color-bg;
  color: @color-text;
  font: inherit;
}

.job-list {
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.job-card {
  display: flex;
  justify-content: space-between;
  gap: @space-md;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;

  h3 {
    font-size: @font-size-lg;
    margin-bottom: @space-xs;
  }

  p {
    color: @color-text-secondary;
    margin-top: @space-xs;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: @space-sm;
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

@media (max-width: 960px) {
  .job-create__workspace,
  .job-page__filters {
    grid-template-columns: 1fr;
  }
}
</style>
