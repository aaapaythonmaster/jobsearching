import { describe, expect, it, vi } from 'vitest'
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
