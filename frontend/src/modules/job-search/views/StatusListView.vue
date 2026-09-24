<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseEmpty from '@/components/BaseEmpty/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { useJobSearchStore } from '../store'
import type { ApplicationStatus } from '../types'

const store = useJobSearchStore()
const form = reactive({
  name: '',
  color: '#29ef87',
  sortOrder: 0,
})
const editingId = ref<string | null>(null)
const statusCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const job of store.jobs) {
    if (job.statusId) counts.set(job.statusId, (counts.get(job.statusId) ?? 0) + 1)
  }
  return counts
})
const colorPresets = [
  '#e7fdf2',
  '#b8fad7',
  '#88f6bc',
  '#29ef87',
  '#09773d',
]
const colorValues = new Set(colorPresets)

onMounted(() => Promise.all([store.fetchStatuses(), store.fetchJobs()]))

function edit(status: ApplicationStatus) {
  editingId.value = status.id
  form.name = status.name
  form.color = status.color && colorValues.has(status.color) ? status.color : '#29ef87'
  form.sortOrder = status.sortOrder
}

function reset() {
  editingId.value = null
  form.name = ''
  form.color = '#29ef87'
  form.sortOrder = 0
}

async function save() {
  if (!form.name.trim()) return
  const input = {
    name: form.name.trim(),
    color: form.color.trim() || undefined,
    sortOrder: Number(form.sortOrder) || 0,
  }
  if (editingId.value) await store.updateStatus(editingId.value, input)
  else await store.createStatus(input)
  reset()
}

async function remove(id: string) {
  if (!window.confirm('确认删除这个状态吗？已被岗位使用的状态不能删除。')) return
  await store.removeStatus(id)
}
</script>

<template>
  <section class="status-page">
    <header>
      <h2>求职状态</h2>
      <p>维护全局状态，岗位可选择其中一个作为当前进展。</p>
    </header>

    <div class="status-page__grid">
      <div class="status-page__sidebar">
        <section class="panel status-page__summary" aria-label="求职状态分析">
          <h3>求职状态分析</h3>
          <RouterLink
            v-for="status in store.statuses"
            :key="status.id"
            :to="{ path: '/job-search/jobs', query: { statusId: status.id } }"
            class="status-summary-card"
          >
            <span>{{ status.name }}</span>
            <strong>{{ statusCounts.get(status.id) ?? 0 }} 家</strong>
          </RouterLink>
        </section>

        <form class="panel" @submit.prevent="save">
          <h3>{{ editingId ? '编辑状态' : '新增状态' }}</h3>
          <label>名称<BaseInput v-model="form.name" placeholder="例如 已打招呼" /></label>
          <label>
            颜色
            <span class="color-swatches" role="radiogroup" aria-label="状态颜色">
              <button
                v-for="color in colorPresets"
                :key="color"
                type="button"
                class="color-swatch"
                :class="{ 'color-swatch--selected': form.color === color, 'color-swatch--dark': color === '#09773d' }"
                :style="{ backgroundColor: color }"
                :data-color-value="color"
                :aria-label="color"
                role="radio"
                :aria-checked="form.color === color"
                @click="form.color = color"
              >
                <svg v-if="form.color === color" class="color-swatch__check" viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.4 3.4 7.6-7.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </span>
          </label>
          <label>排序<BaseInput v-model="form.sortOrder" type="number" /></label>
          <div class="status-page__actions">
            <BaseButton type="submit" :loading="store.loading">保存</BaseButton>
            <BaseButton v-if="editingId" variant="ghost" @click="reset">取消</BaseButton>
          </div>
        </form>
      </div>

      <div class="panel">
        <div v-if="store.error" class="state state--error">{{ store.error }}</div>
        <div v-else-if="store.loading && store.statuses.length === 0" class="state">加载中...</div>
        <BaseEmpty v-else-if="store.statuses.length === 0" description="暂无状态" />
        <div v-else class="status-list" aria-label="求职阶段列表">
          <article
            v-for="status in store.statuses"
            :key="status.id"
            class="status-card"
            :data-status-name="status.name"
          >
            <div class="status-card__main">
              <span class="status-card__swatch" :style="{ backgroundColor: status.color && colorValues.has(status.color) ? status.color : '#29ef87' }" />
              <div>
                <h3>{{ status.name }}</h3>
                <p>排序 {{ status.sortOrder }}</p>
              </div>
            </div>
            <div class="status-card__actions">
              <BaseButton size="sm" @click="edit(status)">编辑</BaseButton>
              <BaseButton size="sm" variant="danger" @click="remove(status.id)">删除</BaseButton>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.status-page {
  display: flex;
  flex-direction: column;
  gap: @space-lg;

  h2 {
    font-size: @font-size-xxl;
    margin-bottom: @space-xs;
  }

  header p {
    color: @color-text-secondary;
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(280px, 360px) 1fr;
    gap: @space-lg;
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    gap: @space-lg;
  }

  &__actions {
    display: flex;
    gap: @space-md;
  }
}

.status-summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: @space-md;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;
  color: @color-text;
  background: @color-bg;
  text-align: left;
  &:hover { border-color: @color-primary; background: fade(@color-primary, 6%); }
  strong { color: @color-primary; }
}

.panel {
  .workspace-surface();
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

.color-swatches {
  display: flex;
  align-items: center;
  gap: @space-sm;
  min-height: 36px;
}

.color-swatch {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px fade(@color-text, 18%);
  transition: transform 120ms ease, box-shadow 120ms ease;

  &:hover,
  &:focus-visible {
    transform: scale(1.08);
  }

  &--selected {
    border-color: transparent;
    box-shadow: none;
    transform: scale(1.06);
  }

  &--dark {
    .color-swatch__check {
      color: #fff;
    }
  }
}

.color-swatch__check {
  width: 18px;
  height: 18px;
  color: #092115;
  pointer-events: none;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.status-card {
  display: flex;
  justify-content: space-between;
  gap: @space-md;
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-md;

  &__main,
  &__actions {
    display: flex;
    align-items: center;
    gap: @space-md;
  }

  &__swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid @color-border-strong;
  }

  p {
    color: @color-text-secondary;
    margin-top: @space-xs;
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

@media (max-width: 760px) {
  .status-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
