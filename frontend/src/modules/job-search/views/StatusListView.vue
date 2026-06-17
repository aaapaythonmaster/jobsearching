<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseEmpty from '@/components/BaseEmpty/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { useJobSearchStore } from '../store'
import type { ApplicationStatus } from '../types'

const store = useJobSearchStore()
const form = reactive({
  name: '',
  color: '#2563eb',
  sortOrder: 0,
})
const editingId = ref<string | null>(null)

onMounted(() => store.fetchStatuses())

function edit(status: ApplicationStatus) {
  editingId.value = status.id
  form.name = status.name
  form.color = status.color || '#2563eb'
  form.sortOrder = status.sortOrder
}

function reset() {
  editingId.value = null
  form.name = ''
  form.color = '#2563eb'
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
      <form class="panel" @submit.prevent="save">
        <h3>{{ editingId ? '编辑状态' : '新增状态' }}</h3>
        <label>名称<BaseInput v-model="form.name" placeholder="例如 已打招呼" /></label>
        <label>
          颜色
          <input v-model="form.color" type="color" />
        </label>
        <label>排序<BaseInput v-model="form.sortOrder" type="number" /></label>
        <div class="status-page__actions">
          <BaseButton type="submit" :loading="store.loading">保存</BaseButton>
          <BaseButton v-if="editingId" variant="ghost" @click="reset">取消</BaseButton>
        </div>
      </form>

      <div class="panel">
        <div v-if="store.error" class="state state--error">{{ store.error }}</div>
        <div v-else-if="store.loading && store.statuses.length === 0" class="state">加载中...</div>
        <BaseEmpty v-else-if="store.statuses.length === 0" description="暂无状态" />
        <div v-else class="status-list">
          <article v-for="status in store.statuses" :key="status.id" class="status-card">
            <div class="status-card__main">
              <span class="status-card__swatch" :style="{ backgroundColor: status.color || '#94a3b8' }" />
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

  &__actions {
    display: flex;
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

input[type='color'] {
  width: 64px;
  height: 36px;
  border: 1px solid @color-border-strong;
  border-radius: @radius-md;
  background: @color-bg;
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
