<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/BaseButton/index.vue'
import BaseEmpty from '@/components/BaseEmpty/index.vue'
import BaseInput from '@/components/BaseInput/index.vue'
import { useJobSearchStore } from '../store'
import type { Resume } from '../types'

const store = useJobSearchStore()
const keyword = ref('')
const targetRole = ref('')
const selectedFile = ref<File | null>(null)
const uploadForm = reactive({
  name: '',
  targetRole: '',
  notes: '',
})
const editing = ref<Resume | null>(null)
const editForm = reactive({
  name: '',
  targetRole: '',
  contentText: '',
  notes: '',
})

onMounted(() => store.fetchResumes())

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function search() {
  await store.fetchResumes({
    keyword: keyword.value.trim() || undefined,
    targetRole: targetRole.value.trim() || undefined,
  })
}

async function upload() {
  if (!selectedFile.value) return
  await store.uploadResume({
    file: selectedFile.value,
    name: uploadForm.name.trim() || undefined,
    targetRole: uploadForm.targetRole.trim() || undefined,
    notes: uploadForm.notes.trim() || undefined,
  })
  selectedFile.value = null
  uploadForm.name = ''
  uploadForm.targetRole = ''
  uploadForm.notes = ''
}

function startEdit(resume: Resume) {
  editing.value = resume
  editForm.name = resume.name
  editForm.targetRole = resume.targetRole ?? ''
  editForm.contentText = resume.contentText
  editForm.notes = resume.notes ?? ''
}

async function saveEdit() {
  if (!editing.value) return
  await store.updateResume(editing.value.id, {
    name: editForm.name?.trim(),
    targetRole: editForm.targetRole?.trim() || null,
    contentText: editForm.contentText?.trim(),
    notes: editForm.notes?.trim() || null,
  })
  editing.value = null
}

async function removeResume(id: string) {
  if (!window.confirm('确认删除这份简历吗？')) return
  await store.removeResume(id)
  if (editing.value?.id === id) editing.value = null
}
</script>

<template>
  <section class="resume-page">
    <header class="resume-page__header">
      <div>
        <h2>基础简历</h2>
        <p>上传 Word/PDF，修正提取文本，保留多份基础版本。</p>
      </div>
    </header>

    <div class="resume-page__grid">
      <form class="panel resume-upload" @submit.prevent="upload">
        <h3>上传简历</h3>
        <label class="resume-upload__trigger" aria-label="上传简历" title="选择简历文件">
          <input type="file" accept=".pdf,.docx,application/pdf" @change="onFileChange" />
          <svg class="resume-upload__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
          </svg>
        </label>
        <label>名称<BaseInput v-model="uploadForm.name" placeholder="默认使用文件名" /></label>
        <label>目标方向<BaseInput v-model="uploadForm.targetRole" placeholder="例如 AI产品经理" /></label>
        <label>备注<textarea v-model="uploadForm.notes" rows="3" /></label>
        <BaseButton type="submit" :disabled="!selectedFile" :loading="store.loading">上传并提取</BaseButton>
      </form>

      <div class="panel">
        <div class="resume-page__filters">
          <BaseInput v-model="keyword" placeholder="搜索简历" @enter="search" />
          <BaseInput v-model="targetRole" placeholder="目标方向" @enter="search" />
          <BaseButton variant="secondary" @click="search">筛选</BaseButton>
        </div>

        <div v-if="store.error" class="state state--error">{{ store.error }}</div>
        <div v-else-if="store.loading && store.resumes.length === 0" class="state">加载中...</div>
        <BaseEmpty v-else-if="store.resumes.length === 0" description="暂无简历" />
        <div v-else class="resume-list">
          <article v-for="resume in store.resumes" :key="resume.id" class="resume-card">
            <div>
              <h3>{{ resume.name }}</h3>
              <p>{{ resume.targetRole || '未设置方向' }} · {{ resume.sourceFileName }}</p>
            </div>
            <div class="resume-card__actions">
              <BaseButton size="sm" @click="startEdit(resume)">编辑</BaseButton>
              <BaseButton size="sm" variant="danger" @click="removeResume(resume.id)">删除</BaseButton>
            </div>
          </article>
        </div>
      </div>
    </div>

    <form v-if="editing" class="panel" @submit.prevent="saveEdit">
      <h3>编辑简历文本</h3>
      <div class="resume-page__row">
        <label>名称<BaseInput v-model="editForm.name" /></label>
        <label>目标方向<BaseInput v-model="editForm.targetRole" /></label>
      </div>
      <label>修正后的简历正文<textarea v-model="editForm.contentText" rows="16" /></label>
      <label>备注<textarea v-model="editForm.notes" rows="3" /></label>
      <div class="resume-page__actions">
        <BaseButton type="submit" :loading="store.loading">保存修改</BaseButton>
        <BaseButton variant="ghost" @click="editing = null">取消</BaseButton>
      </div>
    </form>
  </section>
</template>

<style lang="less" scoped>
.resume-page {
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
    grid-template-columns: minmax(300px, 380px) 1fr;
    gap: @space-lg;
  }

  &__filters,
  &__row {
    display: grid;
    grid-template-columns: 1fr 180px auto;
    gap: @space-md;
    align-items: center;
  }

  &__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__actions {
    display: flex;
    gap: @space-md;
  }
}

.panel {
  .glass-surface();
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

textarea {
  width: 100%;
  border: 1px solid @color-border-strong;
  border-radius: @radius-md;
  padding: @space-sm @space-md;
  background: @color-bg;
  color: @color-text;
  font: inherit;
}

.resume-upload__trigger {
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed @color-border-strong;
  border-radius: @radius-lg;
  color: @color-primary;
  cursor: pointer;
  transition:
    border-color @transition-fast,
    background-color @transition-fast,
    transform @transition-fast;

  &:hover {
    border-color: @color-primary;
    background: fade(@color-primary, 8%);
    transform: translateY(-1px);
  }

  &:focus-within {
    outline: 3px solid fade(@color-primary, 22%);
    outline-offset: 3px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
}

.resume-upload__icon {
  width: 34px;
  height: 34px;
}

textarea {
  resize: vertical;
}

.resume-list {
  display: flex;
  flex-direction: column;
  gap: @space-md;
}

.resume-card {
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

@media (max-width: 920px) {
  .resume-page__grid,
  .resume-page__filters,
  .resume-page__row {
    grid-template-columns: 1fr;
  }
}
</style>
