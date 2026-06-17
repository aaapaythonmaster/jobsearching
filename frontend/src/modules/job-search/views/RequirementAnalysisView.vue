<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseEmpty from '@/components/BaseEmpty/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { jobSearchApi } from '../api'
import { useJobSearchStore } from '../store'
import type { RequirementAnalysis, RequirementGroup } from '../types'

const store = useJobSearchStore()
const analyses = ref<RequirementAnalysis[]>([])
const selectedJobIds = ref<string[]>([])
const title = ref('')
const loading = ref(false)
const generating = ref(false)
const error = ref<string | null>(null)

const selectedCount = computed(() => selectedJobIds.value.length)
const latestAnalysis = computed(() => analyses.value[0] ?? null)

onMounted(async () => {
  await load()
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [nextAnalyses] = await Promise.all([jobSearchApi.listRequirementAnalyses(), store.fetchJobs()])
    analyses.value = nextAnalyses
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function toggleJob(id: string) {
  selectedJobIds.value = selectedJobIds.value.includes(id)
    ? selectedJobIds.value.filter((item) => item !== id)
    : [...selectedJobIds.value, id]
}

function selectAllVisible() {
  selectedJobIds.value = store.jobs.map((job) => job.id)
}

function clearSelection() {
  selectedJobIds.value = []
}

function showAnalysis(analysis: RequirementAnalysis) {
  analyses.value = [analysis, ...analyses.value.filter((item) => item.id !== analysis.id)]
}

async function generateAnalysis() {
  if (selectedJobIds.value.length < 2) {
    error.value = '请至少选择 2 条 JD'
    return
  }
  generating.value = true
  error.value = null
  try {
    const analysis = await jobSearchApi.generateRequirementAnalysis({
      title: title.value.trim() || undefined,
      jobPostIds: selectedJobIds.value,
    })
    analyses.value = [analysis, ...analyses.value]
    title.value = ''
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    generating.value = false
  }
}

function groupItems(group: RequirementGroup): Array<{ label: string; items: string[] }> {
  return [
    { label: '共同硬技能', items: group.commonSkills },
    { label: '共同经验要求', items: group.commonExperience },
    { label: '共同工具/框架', items: group.commonTools },
    { label: '软性要求', items: group.softRequirements },
    { label: '加分项', items: group.niceToHave },
    { label: '风险提醒', items: group.riskNotes },
  ]
}
</script>

<template>
  <section class="analysis-page">
    <header class="analysis-page__header">
      <div>
        <h2>JD 共性分析</h2>
        <p>手动选择一批岗位，按岗位方向分组提取共性要求。</p>
      </div>
      <BaseButton variant="secondary" :loading="loading" @click="load">刷新</BaseButton>
    </header>

    <div class="analysis-page__grid">
      <section class="panel">
        <h3>选择 JD</h3>
        <BaseInput v-model="title" placeholder="分析标题，可选" />
        <div class="analysis-page__actions">
          <BaseButton size="sm" variant="secondary" @click="selectAllVisible">全选当前列表</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="clearSelection">清空选择</BaseButton>
        </div>
        <div v-if="store.jobs.length" class="job-select-list">
          <label v-for="job in store.jobs" :key="job.id" class="job-select-item">
            <input
              type="checkbox"
              :checked="selectedJobIds.includes(job.id)"
              @change="toggleJob(job.id)"
            />
            <span>
              <strong>{{ job.jobTitle }}</strong>
              <small>{{ job.companyName }} · {{ job.jobDirection }} · {{ job.city || '城市未填' }}</small>
            </span>
          </label>
        </div>
        <BaseEmpty v-else description="暂无岗位，请先保存 JD" />
        <BaseButton
          :disabled="selectedCount < 2"
          :loading="generating"
          @click="generateAnalysis"
        >
          生成共性分析（{{ selectedCount }}）
        </BaseButton>
        <p v-if="error" class="state state--error">{{ error }}</p>
      </section>

      <section class="panel">
        <h3>分析结果</h3>
        <div v-if="loading && !analyses.length" class="state">加载中...</div>
        <BaseEmpty v-else-if="!latestAnalysis" description="暂无分析结果" />
        <article v-else class="analysis-result">
          <header>
            <h4>{{ latestAnalysis.title }}</h4>
            <span>{{ new Date(latestAnalysis.createdAt).toLocaleString('zh-CN') }}</span>
          </header>
          <p class="analysis-result__summary">{{ latestAnalysis.summary }}</p>
          <div class="analysis-groups">
            <section
              v-for="group in latestAnalysis.groupedResult.groups"
              :key="group.jobDirection"
              class="analysis-group"
            >
              <h4>{{ group.jobDirection }} · {{ group.jobPostCount }} 条 JD</h4>
              <div class="analysis-group__grid">
                <div v-for="section in groupItems(group)" :key="section.label">
                  <h5>{{ section.label }}</h5>
                  <ul v-if="section.items.length">
                    <li v-for="item in section.items" :key="item">{{ item }}</li>
                  </ul>
                  <p v-else>暂无</p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </section>
    </div>

    <section class="panel">
      <h3>历史分析</h3>
      <div v-if="analyses.length" class="history-list">
        <button
          v-for="analysis in analyses"
          :key="analysis.id"
          type="button"
          class="history-item"
          @click="showAnalysis(analysis)"
        >
          <strong>{{ analysis.title }}</strong>
          <span>{{ analysis.groupedResult.groups.length }} 组 · {{ new Date(analysis.createdAt).toLocaleString('zh-CN') }}</span>
        </button>
      </div>
      <BaseEmpty v-else description="暂无历史分析" />
    </section>
  </section>
</template>

<style lang="less" scoped>
.analysis-page {
  display: flex;
  flex-direction: column;
  gap: @space-lg;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: @space-md;

    h2 {
      font-size: @font-size-xxl;
      margin-bottom: @space-xs;
    }

    p {
      color: @color-text-secondary;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: @space-lg;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: @space-sm;
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
}

.job-select-list,
.history-list,
.analysis-groups {
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.job-select-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: @space-sm;
  align-items: flex-start;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;
  background: @color-bg;

  input {
    margin-top: 4px;
  }

  span {
    display: flex;
    flex-direction: column;
    gap: @space-xs;
  }

  small {
    color: @color-text-secondary;
    line-height: 1.5;
  }
}

.analysis-result {
  display: flex;
  flex-direction: column;
  gap: @space-md;

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: @space-md;

    h4 {
      font-size: @font-size-lg;
    }

    span {
      color: @color-text-secondary;
      font-size: @font-size-sm;
    }
  }

  &__summary {
    color: @color-text;
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.analysis-group {
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;
  background: @color-bg;

  h4 {
    margin-bottom: @space-md;
    font-size: @font-size-lg;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: @space-md;

    h5 {
      margin-bottom: @space-xs;
      color: @color-text-secondary;
      font-size: @font-size-sm;
    }

    ul {
      margin: 0;
      padding-left: @space-lg;
      line-height: 1.7;
    }

    p {
      color: @color-text-secondary;
    }
  }
}

.history-item {
  width: 100%;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;
  background: @color-bg;
  color: @color-text;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: @space-xs;

  span {
    color: @color-text-secondary;
    font-size: @font-size-sm;
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

@media (max-width: 960px) {
  .analysis-page__header,
  .analysis-page__grid,
  .analysis-group__grid {
    grid-template-columns: 1fr;
  }

  .analysis-page__header,
  .analysis-result > header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
