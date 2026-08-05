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

    return { accepted: accepted.length, rejected, selectionError: null }
  }

  return { tasks, selectedTaskId, activeTask, addFiles }
}
