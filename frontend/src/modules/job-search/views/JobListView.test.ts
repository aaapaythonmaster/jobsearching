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
  openJobContext: vi.fn(),
  job: {
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
  },
}))

vi.mock('../api', () => ({
  jobSearchApi: {
    extractJobImage: mocks.extractJobImage,
    parseJob: mocks.parseJob,
  },
}))

vi.mock('../store', () => ({
  useJobSearchStore: () => ({
    jobs: [mocks.job],
    statuses: [],
    loading: false,
    error: null,
    createJob: mocks.createJob,
    fetchJobs: mocks.fetchJobs,
    fetchStatuses: mocks.fetchStatuses,
    removeJob: mocks.removeJob,
    openJobContext: mocks.openJobContext,
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

  it('opens the first listed job in the right context by default', async () => {
    await mountPage()

    await vi.waitFor(() => expect(mocks.openJobContext).toHaveBeenCalledWith(mocks.job, 'detail'))
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

  it('exposes separate action and filter regions for the job workspace', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.get('[aria-label="岗位操作"]').text()).not.toContain('新增岗位')
    expect(wrapper.find('.job-page__add').exists()).toBe(false)
    expect(wrapper.get('[aria-label="岗位筛选"] input').attributes('placeholder')).toContain('搜索')
  })

  it('keeps job actions in the list and opens each action in the right context', async () => {
    const { router, wrapper } = await mountPage()
    await vi.waitFor(() => expect(mocks.openJobContext).toHaveBeenCalledWith(mocks.job, 'detail'))
    mocks.openJobContext.mockClear()
    const actions = wrapper.findAll('.job-card__actions .base-button')
    expect(actions.map((button) => button.text().trim())).toEqual(['打招呼', '简历调整', '编辑', '删除'])
    expect(wrapper.get('[aria-label="编辑岗位"]').classes()).toContain('base-button--ghost')
    expect(wrapper.get('[aria-label="删除岗位"]').classes()).toContain('base-button--ghost')
    expect(wrapper.findAll('.job-card__icon-action')).toHaveLength(2)
    const pencilPaths = wrapper.get('[aria-label="编辑岗位"] svg').findAll('path')
    expect(pencilPaths[0].attributes('d')).toBe(
      'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    )
    expect(pencilPaths[1].attributes('d')).toBe('m15 5 4 4')

    await actions[0].trigger('click')
    await actions[1].trigger('click')
    await actions[2].trigger('click')

    expect(router.currentRoute.value.name).toBe('job-search-job-list')
    expect(mocks.openJobContext).toHaveBeenNthCalledWith(1, createdJob, 'greeting')
    expect(mocks.openJobContext).toHaveBeenNthCalledWith(2, createdJob, 'tailored')
    expect(mocks.openJobContext).toHaveBeenNthCalledWith(3, createdJob, 'detail')
  })
})
