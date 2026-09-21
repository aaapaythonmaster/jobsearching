import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewOverviewView from './InterviewOverviewView.vue'

const store = vi.hoisted(() => ({
  projects: [] as Array<Record<string, unknown>>,
  reviewLoading: false,
  reviewError: null as string | null,
  loadReviewProjects: vi.fn(),
}))

vi.mock('../store', () => ({ useInterviewPrepStore: () => store }))

describe('InterviewOverviewView', () => {
  beforeEach(() => {
    store.projects = []
    store.reviewError = null
    store.loadReviewProjects.mockReset().mockResolvedValue(undefined)
  })

  it('renders every job with its question count and detail link', async () => {
    store.projects = [
      {
        jobPostId: 'job-1',
        companyName: '星海科技',
        jobTitle: '前端工程师',
        questionCount: 3,
        latestQuestionAt: '2026-08-16T12:00:00.000Z',
      },
    ]
    const wrapper = mount(InterviewOverviewView, {
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a><slot /></a>' },
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('星海科技')
    expect(wrapper.text()).toContain('前端工程师')
    expect(wrapper.text()).toContain('3 个问题')
    expect(wrapper.find('[aria-label="面试准备概览"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="面试项目列表"]').findAll('article')).toHaveLength(1)
  })

  it('guides an empty workspace to add a job', async () => {
    const wrapper = mount(InterviewOverviewView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('还没有岗位')
    expect(wrapper.text()).toContain('先添加岗位')
  })
})
