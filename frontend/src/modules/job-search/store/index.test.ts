import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useJobSearchStore } from './index'

vi.mock('../api', () => ({ jobSearchApi: {} }))

const job = {
  id: 'job-1',
  companyName: '示例公司',
  jobTitle: 'AI 产品经理',
  jobDirection: 'AI 产品',
  city: '北京',
  salaryRange: '20-30K',
  sourcePlatform: 'Boss直聘',
  jobUrl: null,
  jdText: '完整 JD',
  statusId: null,
  notes: null,
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
}

describe('job context state', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('opens a selected job in the requested right-panel mode and clears it without navigation', () => {
    const store = useJobSearchStore()

    store.openJobContext(job, 'greeting')
    expect(store.contextJob).toEqual(job)
    expect(store.contextMode).toBe('greeting')

    store.setJobContextMode('tailored')
    expect(store.contextMode).toBe('tailored')

    store.clearJobContext()
    expect(store.contextJob).toBeNull()
    expect(store.contextMode).toBe('detail')
  })
})
