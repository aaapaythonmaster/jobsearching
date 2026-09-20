<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import type { JobImageTask, JobImageTaskStatus } from '../types'

defineProps<{
  tasks: JobImageTask[]
  selectedTaskId: string | null
  processing: boolean
}>()

const emit = defineEmits<{
  (e: 'files', files: File[]): void
  (e: 'select', id: string): void
  (e: 'retry', id: string): void
  (e: 'remove', id: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const statusLabels: Record<JobImageTaskStatus, string> = {
  queued: '等待识别',
  extracting: '识别中',
  ready: '待确认',
  saving: '保存中',
  extract_failed: '识别失败',
  save_failed: '保存失败',
}

function chooseFiles() {
  inputRef.value?.click()
}

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length > 0) emit('files', files)
  input.value = ''
}
</script>

<template>
  <aside class="image-queue" aria-label="岗位截图任务">
    <input
      ref="inputRef"
      class="visually-hidden"
      type="file"
      accept="image/*"
      multiple
      @change="onFiles"
    />
    <BaseButton type="button" block @click="chooseFiles">＋ 选择截图（最多 10 张）</BaseButton>
    <p class="image-queue__summary">
      {{ tasks.length }} 个待处理任务<span v-if="processing"> · 正在识别</span>
    </p>

    <p v-if="tasks.length === 0" class="image-queue__empty">选择截图后，任务会显示在这里</p>
    <ul v-else class="image-queue__list">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="image-task"
        :class="{ 'image-task--selected': task.id === selectedTaskId }"
      >
        <button
          :data-testid="`job-image-task-${task.id}`"
          class="image-task__select"
          type="button"
          @click="emit('select', task.id)"
        >
          <img :src="task.previewUrl" alt="" />
          <span class="image-task__content">
            <strong>{{ task.file.name }}</strong>
            <small :class="`image-task__status image-task__status--${task.status}`">
              {{ statusLabels[task.status] }}
            </small>
          </span>
        </button>
        <p v-if="task.error" class="image-task__error">{{ task.error }}</p>
        <div class="image-task__actions">
          <button
            v-if="task.status === 'extract_failed'"
            type="button"
            :aria-label="`重试 ${task.file.name}`"
            @click="emit('retry', task.id)"
          >
            重试
          </button>
          <button
            type="button"
            :aria-label="`移除 ${task.file.name}`"
            @click="emit('remove', task.id)"
          >
            移除
          </button>
        </div>
      </li>
    </ul>
  </aside>
</template>

<style lang="less" scoped>
.image-queue {
  display: flex;
  flex-direction: column;
  gap: @space-md;
  min-width: 0;

  &__summary {
    color: @color-text-secondary;
    font-size: @font-size-sm;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: @space-sm;
  }

  &__empty {
    margin: 0;
    padding: 18px 12px;
    border: 1px dashed @color-border-strong;
    border-radius: @radius-md;
    color: @color-text-disabled;
    font-size: @font-size-sm;
    text-align: center;
  }
}

.image-task {
  border: 1px solid @color-border;
  border-radius: @radius-md;
  padding: @space-sm;
  background: @color-bg;

  &--selected {
    border-color: @color-primary;
    box-shadow: 0 0 0 2px fade(@color-primary, 12%);
  }

  &__select {
    width: 100%;
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: @space-sm;
    align-items: center;
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;

    img {
      width: 48px;
      height: 48px;
      border-radius: @radius-sm;
      object-fit: cover;
      background: @color-bg-elevated;
    }
  }

  &__content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: @font-size-sm;
    }
  }

  &__status {
    color: @color-text-secondary;

    &--ready {
      color: @color-success;
    }

    &--extract_failed,
    &--save_failed {
      color: @color-danger;
    }
  }

  &__error {
    margin-top: @space-xs;
    color: @color-danger;
    font-size: @font-size-sm;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: @space-sm;
    margin-top: @space-xs;

    button {
      border: 0;
      padding: 2px;
      background: transparent;
      color: @color-text-secondary;
      font-size: @font-size-sm;
      cursor: pointer;
    }
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
