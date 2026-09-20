<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { createEmptyJobDraft } from '../composables/useJobImageQueue'
import type { ApplicationStatus, JobImageTask, JobPostCreateInput } from '../types'

const props = defineProps<{
  task: JobImageTask | null
  statuses: ApplicationStatus[]
}>()

const emit = defineEmits<{
  (e: 'update:draft', draft: JobPostCreateInput): void
  (e: 'save', draft: JobPostCreateInput): void
  (e: 'skip'): void
  (e: 'retry', id: string): void
  (e: 'remove', id: string): void
}>()

const draft = reactive<JobPostCreateInput>(createEmptyJobDraft())
const validationError = ref<string | null>(null)
let syncing = false

watch(
  () => props.task,
  (task) => {
    syncing = true
    Object.assign(draft, createEmptyJobDraft(), task?.draft ?? {})
    validationError.value = null
    syncing = false
  },
  { immediate: true },
)

watch(
  draft,
  (value) => {
    if (!syncing && props.task) emit('update:draft', { ...value })
  },
  { deep: true },
)

function submit() {
  const required = [draft.companyName, draft.jobTitle, draft.jobDirection, draft.jdText]
  if (required.some((value) => !value.trim())) {
    validationError.value = '请填写公司、岗位、方向和 JD 原文'
    return
  }
  validationError.value = null
  emit('save', { ...draft })
}
</script>

<template>
  <section class="draft-review" aria-label="岗位审核">
    <div v-if="!task" class="draft-review__empty">
      <strong>等待选择岗位截图</strong>
      <p>上传后，在左侧任务列表中选择要审核的岗位。</p>
    </div>

    <template v-else-if="task.status === 'queued' || task.status === 'extracting'">
      <div class="draft-review__state">
        <strong>{{ task.file.name }}</strong>
        <p>{{ task.status === 'queued' ? '等待识别…' : '正在识别 JD 并解析岗位字段…' }}</p>
      </div>
    </template>

    <template v-else-if="task.status === 'extract_failed'">
      <div class="draft-review__state draft-review__state--error">
        <strong>{{ task.file.name }}</strong>
        <p>{{ task.error || '识别失败' }}</p>
        <div class="draft-review__actions">
          <BaseButton variant="secondary" @click="emit('remove', task.id)">移除此项</BaseButton>
          <BaseButton @click="emit('retry', task.id)">重新识别</BaseButton>
        </div>
      </div>
    </template>

    <form v-else class="draft-review__form" @submit.prevent="submit">
      <header>
        <span>正在审核</span>
        <h3>{{ task.file.name }}</h3>
      </header>

      <div class="draft-review__row">
        <label
          >公司<BaseInput
            v-model="draft.companyName"
            placeholder="公司名称"
            :disabled="task.status === 'saving'"
        /></label>
        <label
          >岗位<BaseInput
            v-model="draft.jobTitle"
            placeholder="岗位名称"
            :disabled="task.status === 'saving'"
        /></label>
      </div>
      <div class="draft-review__row">
        <label
          >方向<BaseInput
            v-model="draft.jobDirection"
            placeholder="例如 AI产品"
            :disabled="task.status === 'saving'"
        /></label>
        <label
          >城市<BaseInput
            v-model="draft.city"
            placeholder="城市"
            :disabled="task.status === 'saving'"
        /></label>
      </div>
      <div class="draft-review__row">
        <label
          >薪资<BaseInput
            v-model="draft.salaryRange"
            placeholder="20-30K"
            :disabled="task.status === 'saving'"
        /></label>
        <label>
          状态
          <select v-model="draft.statusId" :disabled="task.status === 'saving'">
            <option value="">未设置</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </label>
      </div>
      <label>
        JD 原文
        <textarea v-model="draft.jdText" rows="10" :disabled="task.status === 'saving'" />
      </label>
      <label>
        备注
        <textarea v-model="draft.notes" rows="3" :disabled="task.status === 'saving'" />
      </label>

      <p v-if="validationError" class="draft-review__error">{{ validationError }}</p>
      <p v-else-if="task.status === 'save_failed'" class="draft-review__error">
        {{ task.error || '保存失败，请重试' }}
      </p>

      <div class="draft-review__actions">
        <BaseButton
          type="button"
          variant="danger"
          :disabled="task.status === 'saving'"
          @click="emit('remove', task.id)"
        >
          移除此项
        </BaseButton>
        <span class="draft-review__actions-end">
          <BaseButton
            type="button"
            variant="secondary"
            :disabled="task.status === 'saving'"
            @click="emit('skip')"
          >
            跳过
          </BaseButton>
          <BaseButton
            data-testid="save-job-draft"
            type="submit"
            :loading="task.status === 'saving'"
          >
            确认并保存
          </BaseButton>
        </span>
      </div>
    </form>
  </section>
</template>

<style lang="less" scoped>
.draft-review {
  min-width: 0;

  &__empty {
    display: grid;
    min-height: 160px;
    place-content: center;
    gap: 6px;
    border: 1px dashed @color-border-strong;
    border-radius: @radius-md;
    color: @color-text-secondary;
    text-align: center;

    p {
      margin: 0;
      color: @color-text-disabled;
      font-size: @font-size-sm;
    }
  }

  &__state {
    display: flex;
    min-height: 240px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: @space-sm;
    color: @color-text-secondary;
    text-align: center;

    &--error p {
      color: @color-danger;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: @space-md;

    header span {
      color: @color-text-secondary;
      font-size: @font-size-sm;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: @space-xs;
      color: @color-text-secondary;
      font-size: @font-size-sm;
    }
  }

  &__row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: @space-md;
  }

  &__error {
    color: @color-danger;
    font-size: @font-size-sm;
  }

  &__actions {
    display: flex;
    justify-content: space-between;
    gap: @space-md;
  }

  &__actions-end {
    display: flex;
    gap: @space-sm;
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

@media (max-width: 720px) {
  .draft-review__row {
    grid-template-columns: 1fr;
  }
}
</style>
