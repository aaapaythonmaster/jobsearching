<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseEmpty from '@/components/BaseEmpty/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { useJobSearchStore } from '../store'
import type { JobPostCreateInput } from '../types'

const store = useJobSearchStore()
const router = useRouter()
const keyword = ref('')
const statusId = ref('')
const jobDirection = ref('')
const form = reactive<JobPostCreateInput>({
  companyName: '',
  jobTitle: '',
  jobDirection: '',
  city: '',
  salaryRange: '',
  sourcePlatform: 'Boss直聘',
  jobUrl: '',
  jdText: '',
  statusId: '',
  notes: '',
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

function resetForm() {
  form.companyName = ''
  form.jobTitle = ''
  form.jobDirection = ''
  form.city = ''
  form.salaryRange = ''
  form.sourcePlatform = 'Boss直聘'
  form.jobUrl = ''
  form.jdText = ''
  form.statusId = ''
  form.notes = ''
}

async function search() {
  await store.fetchJobs({
    keyword: keyword.value.trim() || undefined,
    statusId: statusId.value || undefined,
    jobDirection: jobDirection.value.trim() || undefined,
  })
}

async function createJob() {
  if (!form.companyName.trim() || !form.jobTitle.trim() || !form.jobDirection.trim() || !form.jdText.trim()) return
  const job = await store.createJob(clean(form))
  resetForm()
  await router.push({ name: 'job-search-job-detail', params: { id: job.id } })
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
        <p>保存 Boss 直聘岗位，记录方向与进展。</p>
      </div>
    </header>

    <div class="job-page__grid">
      <form class="panel" @submit.prevent="createJob">
        <h3>新增岗位</h3>
        <label>公司<BaseInput v-model="form.companyName" placeholder="公司名称" /></label>
        <label>岗位<BaseInput v-model="form.jobTitle" placeholder="岗位名称" /></label>
        <label>方向<BaseInput v-model="form.jobDirection" placeholder="例如 AI产品" /></label>
        <div class="job-page__row">
          <label>城市<BaseInput v-model="form.city" placeholder="城市" /></label>
          <label>薪资<BaseInput v-model="form.salaryRange" placeholder="20-30K" /></label>
        </div>
        <label>链接<BaseInput v-model="form.jobUrl" placeholder="Boss直聘链接" /></label>
        <label>
          状态
          <select v-model="form.statusId">
            <option value="">未设置</option>
            <option v-for="status in store.statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </label>
        <label>JD 原文<textarea v-model="form.jdText" rows="9" placeholder="粘贴 JD 原文" /></label>
        <label>备注<textarea v-model="form.notes" rows="3" placeholder="可选" /></label>
        <BaseButton type="submit" :loading="store.loading">保存岗位</BaseButton>
      </form>

      <div class="panel">
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
      </div>
    </div>
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

  &__grid {
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: @space-lg;
  }

  &__row,
  &__filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: @space-md;
  }

  &__filters {
    grid-template-columns: 1fr 180px 180px auto;
    align-items: center;
    margin-bottom: @space-lg;
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

  h3 {
    font-size: @font-size-lg;
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
  .job-page__grid,
  .job-page__filters {
    grid-template-columns: 1fr;
  }
}
</style>
