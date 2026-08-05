import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JobListView from './JobListView.vue'

const mocks = vi.hoisted(() => ({
  extractJobImage: vi.fn(),
  parseJob: vi.fn(),
  createJob: vi.fn(),
  fetchJobs: vi.fn(),
  fetchStatuses: vi.fn(),
  removeJob: vi.fn(),
}))

vi.mock('../api', () => ({
  jobSearchApi: {
    extractJobImage: mocks.extractJobImage,
    parseJob: mocks.parseJob,
  },
}))

vi.mock('../store', () => ({
  useJobSearchStore: () => ({
    jobs: [],
    statuses: [],
    loading: false,
    error: null,
    createJob: mocks.createJob,
    fetchJobs: mocks.fetchJobs,
    fetchStatuses: mocks.fetchStatuses,
    removeJob: mocks.removeJob,
  }),
}))

const parsedJob = {
  companyName: '示例公司',
  jobTitle: 'AI 产品经理',
  jobDirection: 'AI 产品',
  city: '成都',
  salaryRange: '20-30K',
  sourcePlatform: 'Boss直聘',
  jobUrl: null,
  notes: null,
}

const createdJob = {
  id: 'job-1',
  companyName: '示例公司',
  jobTitle: 'AI 产品经理',
  jobDirection: 'AI 产品',
  city: '成都',
  salaryRange: '20-30K',
  sourcePlatform: 'Boss直聘',
  jobUrl: null,
  jdText: '完整 JD',
  statusId: null,
  notes: null,
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/job-search/jobs', name: 'job-search-job-list', component: JobListView },
      { path: '/job-search/jobs/:id', name: 'job-search-job-detail', component: { template: '<div />' } },
    ],
  })
  await router.push('/job-search/jobs')
  await router.isReady()
  return {
    router,
    wrapper: mount(JobListView, { global: { plugins: [router] } }),
  }
}

describe('JobListView batch screenshot flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.extractJobImage.mockResolvedValue({ jdText: '完整 JD' })
    mocks.parseJob.mockResolvedValue(parsedJob)
    mocks.createJob.mockResolvedValue(createdJob)
  })

  it('recognizes every selected screenshot as an independent task', async () => {
    const { wrapper } = await mountPage()
    const input = wrapper.get('input[type="file"]')
    const files = [
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
    ]
    Object.defineProperty(input.element, 'files', { value: files, configurable: true })

    await input.trigger('change')

    await vi.waitFor(() => expect(mocks.extractJobImage).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(wrapper.text()).toContain('2 个待处理任务'))
  })

  it('creates the reviewed job without navigating to its detail page', async () => {
    const { router, wrapper } = await mountPage()
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['one'], 'one.png', { type: 'image/png' })],
      configurable: true,
    })
    await input.trigger('change')
    await vi.waitFor(() => expect(wrapper.text()).toContain('待确认'))

    await wrapper.get('[aria-label="岗位审核"] form').trigger('submit')

    await vi.waitFor(() => expect(mocks.createJob).toHaveBeenCalledTimes(1))
    expect(router.currentRoute.value.name).toBe('job-search-job-list')
  })
})
