import { computed, ref } from 'vue'
import type {
  JobImageTask,
  JobPostCreateInput,
  JobPostImageExtracted,
  JobPostParsed,
  RejectedJobImage,
} from '../types'

const MAX_FILES = 10
const MAX_FILE_SIZE = 8 * 1024 * 1024

export interface JobImageQueueOptions {
  extract: (file: File) => Promise<JobPostImageExtracted>
  parse: (jdText: string) => Promise<JobPostParsed>
  createId?: (file: File) => string
  createPreviewUrl?: (file: File) => string
  revokePreviewUrl?: (url: string) => void
}

export function createEmptyJobDraft(): JobPostCreateInput {
  return {
    companyName: '',
    jobTitle: '',
    jobDirection: '',
    city: '',
    salaryRange: '',
    sourcePlatform: 'Boss直聘',
    jdText: '',
    statusId: '',
    notes: '',
  }
}

export function useJobImageQueue(options: JobImageQueueOptions) {
  const tasks = ref<JobImageTask[]>([])
  const selectedTaskId = ref<string | null>(null)
  const activeTask = computed(
    () => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null,
  )
  const createId = options.createId ?? (() => crypto.randomUUID())
  const createPreviewUrl = options.createPreviewUrl ?? URL.createObjectURL
  const revokePreviewUrl = options.revokePreviewUrl ?? URL.revokeObjectURL
  const activeCount = ref(0)

  const processing = computed(
    () => activeCount.value > 0 || tasks.value.some((task) => task.status === 'queued'),
  )

  function selectTask(id: string) {
    if (tasks.value.some((task) => task.id === id)) selectedTaskId.value = id
  }

  function selectNextReady() {
    const currentIndex = tasks.value.findIndex((task) => task.id === selectedTaskId.value)
    const ordered = [...tasks.value.slice(currentIndex + 1), ...tasks.value.slice(0, currentIndex + 1)]
    const next = ordered.find(
      (task) =>
        task.id !== selectedTaskId.value &&
        (task.status === 'ready' || task.status === 'save_failed'),
    )
    selectedTaskId.value = next?.id ?? null
  }

  function updateDraft(id: string, patch: Partial<JobPostCreateInput>) {
    const task = tasks.value.find((item) => item.id === id)
    if (task) task.draft = { ...task.draft, ...patch }
  }

  function markSaving(id: string) {
    const task = tasks.value.find((item) => item.id === id)
    if (!task) return
    task.status = 'saving'
    task.error = null
  }

  function markSaveFailed(id: string, message: string) {
    const task = tasks.value.find((item) => item.id === id)
    if (!task) return
    task.status = 'save_failed'
    task.error = message
  }

  function removeTask(id: string) {
    const index = tasks.value.findIndex((item) => item.id === id)
    if (index < 0) return
    const task = tasks.value[index]
    task.removed = true
    revokePreviewUrl(task.previewUrl)
    tasks.value.splice(index, 1)
    if (selectedTaskId.value === id) selectNextReady()
  }

  function markSaved(id: string) {
    removeTask(id)
  }

  function retryTask(id: string) {
    const task = tasks.value.find((item) => item.id === id)
    if (!task || (task.status !== 'extract_failed' && task.status !== 'save_failed')) return
    task.status = 'queued'
    task.error = null
    pump()
  }

  function pump() {
    while (activeCount.value < 2) {
      const task = tasks.value.find((item) => item.status === 'queued' && !item.removed)
      if (!task) return
      activeCount.value += 1
      task.status = 'extracting'
      void recognize(task).finally(() => {
        activeCount.value -= 1
        pump()
      })
    }
  }

  async function recognize(task: JobImageTask) {
    try {
      const { jdText } = await options.extract(task.file)
      const parsed = await options.parse(jdText)
      if (task.removed) return
      task.draft = {
        ...task.draft,
        jdText,
        companyName: parsed.companyName ?? '',
        jobTitle: parsed.jobTitle ?? '',
        jobDirection: parsed.jobDirection ?? '',
        city: parsed.city ?? '',
        salaryRange: parsed.salaryRange ?? '',
        sourcePlatform: parsed.sourcePlatform ?? 'Boss直聘',
        jobUrl: parsed.jobUrl ?? '',
        notes: parsed.notes ?? '',
      }
      task.status = 'ready'
      task.error = null
      if (!selectedTaskId.value) selectedTaskId.value = task.id
    } catch (error) {
      if (task.removed) return
      task.status = 'extract_failed'
      task.error = (error as Error).message
    }
  }

  function addFiles(files: File[]) {
    if (files.length > MAX_FILES) {
      return {
        accepted: 0,
        rejected: [] as RejectedJobImage[],
        selectionError: '单次最多上传 10 张截图',
      }
    }

    const rejected: RejectedJobImage[] = []
    const accepted = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        rejected.push({ fileName: file.name, reason: 'not_image' })
        return false
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push({ fileName: file.name, reason: 'too_large' })
        return false
      }
      return true
    })

    tasks.value.push(
      ...accepted.map((file) => ({
        id: createId(file),
        file,
        previewUrl: createPreviewUrl(file),
        status: 'queued' as const,
        draft: createEmptyJobDraft(),
        error: null,
        removed: false,
      })),
    )
    pump()

    return { accepted: accepted.length, rejected, selectionError: null }
  }

  return {
    tasks,
    selectedTaskId,
    activeTask,
    processing,
    addFiles,
    selectTask,
    selectNextReady,
    retryTask,
    removeTask,
    updateDraft,
    markSaving,
    markSaved,
    markSaveFailed,
  }
}
