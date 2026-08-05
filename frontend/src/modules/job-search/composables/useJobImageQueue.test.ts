import { describe, expect, it, vi } from 'vitest'
import type { JobPostImageExtracted } from '../types'
import { useJobImageQueue } from './useJobImageQueue'

const image = (name: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' })

const options = () => ({
  extract: vi.fn(async () => ({ jdText: '完整 JD' })),
  parse: vi.fn(async () => ({
    companyName: '示例公司',
    jobTitle: '产品经理',
    jobDirection: 'AI 产品',
    city: null,
    salaryRange: null,
    sourcePlatform: 'Boss直聘',
    jobUrl: null,
    notes: null,
  })),
  createId: vi.fn((file: File) => `id-${file.name}`),
  createPreviewUrl: vi.fn((file: File) => `blob:${file.name}`),
  revokePreviewUrl: vi.fn(),
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('useJobImageQueue input validation', () => {
  it('rejects the whole selection when more than 10 files are chosen', () => {
    const queue = useJobImageQueue(options())
    const result = queue.addFiles(Array.from({ length: 11 }, (_, i) => image(`${i}.png`)))

    expect(result).toEqual({
      accepted: 0,
      rejected: [],
      selectionError: '单次最多上传 10 张截图',
    })
    expect(queue.tasks.value).toHaveLength(0)
  })

  it('accepts valid images and reports invalid files by name', () => {
    const queue = useJobImageQueue(options())
    const oversized = image('large.png', 8 * 1024 * 1024 + 1)
    const text = new File(['x'], 'jd.txt', { type: 'text/plain' })
    const result = queue.addFiles([image('valid.png'), oversized, text])

    expect(result.accepted).toBe(1)
    expect(result.rejected).toEqual([
      { fileName: 'large.png', reason: 'too_large' },
      { fileName: 'jd.txt', reason: 'not_image' },
    ])
  })
})

describe('useJobImageQueue scheduler', () => {
  it('runs at most two recognition pipelines and starts the next after a slot frees', async () => {
    const calls = [
      deferred<JobPostImageExtracted>(),
      deferred<JobPostImageExtracted>(),
      deferred<JobPostImageExtracted>(),
    ]
    const extract = vi.fn(() => calls[extract.mock.calls.length - 1].promise)
    const queue = useJobImageQueue({ ...options(), extract })

    queue.addFiles([image('1.png'), image('2.png'), image('3.png')])

    expect(extract).toHaveBeenCalledTimes(2)
    calls[0].resolve({ jdText: 'JD 1' })
    await vi.waitFor(() => expect(extract).toHaveBeenCalledTimes(3))
  })

  it('isolates recognition failures', async () => {
    const extract = vi
      .fn()
      .mockRejectedValueOnce(new Error('OCR failed'))
      .mockResolvedValue({ jdText: 'JD' })
    const queue = useJobImageQueue({ ...options(), extract })

    queue.addFiles([image('bad.png'), image('good.png')])

    await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('extract_failed'))
    await vi.waitFor(() => expect(queue.tasks.value[1].status).toBe('ready'))
  })

  it('reports processing as false after all recognition completes', async () => {
    const queue = useJobImageQueue(options())
    queue.addFiles([image('complete.png')])

    await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('ready'))

    expect(queue.processing.value).toBe(false)
  })

  it('retries failures through the same scheduler', async () => {
    const extract = vi
      .fn()
      .mockRejectedValueOnce(new Error('OCR failed'))
      .mockResolvedValue({ jdText: 'JD' })
    const queue = useJobImageQueue({ ...options(), extract })
    queue.addFiles([image('retry.png')])
    await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('extract_failed'))

    queue.retryTask(queue.tasks.value[0].id)

    await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('ready'))
    expect(extract).toHaveBeenCalledTimes(2)
  })

  it('does not restore a task removed while recognition is in flight', async () => {
    const pending = deferred<JobPostImageExtracted>()
    const queueOptions = { ...options(), extract: () => pending.promise }
    const queue = useJobImageQueue(queueOptions)
    queue.addFiles([image('remove.png')])
    const id = queue.tasks.value[0].id

    queue.removeTask(id)
    pending.resolve({ jdText: 'late result' })
    await Promise.resolve()

    expect(queue.tasks.value.some((task) => task.id === id)).toBe(false)
    expect(queueOptions.revokePreviewUrl).toHaveBeenCalledWith('blob:remove.png')
  })

  it('merges draft edits without replacing recognized fields', async () => {
    const queue = useJobImageQueue(options())
    queue.addFiles([image('edit.png')])
    await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('ready'))
    const id = queue.tasks.value[0].id

    queue.updateDraft(id, { companyName: '修改后的公司' })

    expect(queue.tasks.value[0].draft.companyName).toBe('修改后的公司')
    expect(queue.tasks.value[0].draft.jobTitle).toBe('产品经理')
  })

  it('preserves a draft when saving fails', async () => {
    const queue = useJobImageQueue(options())
    queue.addFiles([image('save-failed.png')])
    await vi.waitFor(() => expect(queue.tasks.value[0].status).toBe('ready'))
    const id = queue.tasks.value[0].id
    queue.updateDraft(id, { notes: '人工备注' })

    queue.markSaving(id)
    queue.markSaveFailed(id, '保存失败')

    expect(queue.tasks.value[0].status).toBe('save_failed')
    expect(queue.tasks.value[0].error).toBe('保存失败')
    expect(queue.tasks.value[0].draft.notes).toBe('人工备注')
  })

  it('removes a saved task and selects the next ready task', async () => {
    const queue = useJobImageQueue(options())
    queue.addFiles([image('first.png'), image('second.png')])
    await vi.waitFor(() => expect(queue.tasks.value.every((task) => task.status === 'ready')).toBe(true))
    const firstId = queue.tasks.value[0].id
    const secondId = queue.tasks.value[1].id
    queue.selectTask(firstId)

    queue.markSaved(firstId)

    expect(queue.tasks.value.map((task) => task.id)).toEqual([secondId])
    expect(queue.selectedTaskId.value).toBe(secondId)
  })
})
