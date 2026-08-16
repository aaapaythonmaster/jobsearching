import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewQuestionReviewView from './InterviewQuestionReviewView.vue'

const store = vi.hoisted(() => ({
  projects: [
    {
      jobPostId: 'job-1',
      companyName: '星海科技',
      jobTitle: '前端工程师',
      questionCount: 0,
      latestQuestionAt: null,
    },
  ],
  reviewQuestions: [] as Array<Record<string, unknown>>,
  reviewLoading: false,
  reviewError: null as string | null,
  loadReviewProjects: vi.fn(),
  loadReviewQuestions: vi.fn(),
  createReviewQuestion: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { jobPostId: 'job-1' } }),
}))
vi.mock('../store', () => ({ useInterviewPrepStore: () => store }))

describe('InterviewQuestionReviewView', () => {
  beforeEach(() => {
    store.reviewQuestions = []
    store.reviewError = null
    store.loadReviewProjects.mockReset().mockResolvedValue(undefined)
    store.loadReviewQuestions.mockReset().mockResolvedValue(undefined)
    store.createReviewQuestion.mockReset().mockResolvedValue(undefined)
  })

  it('saves round and trimmed question text, then clears only the question', async () => {
    const wrapper = mount(InterviewQuestionReviewView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          BaseButton: false,
          BaseInput: false,
        },
      },
    })
    await flushPromises()
    await wrapper.get('select').setValue('复面')
    await wrapper.get('textarea').setValue('  如何优化首屏性能？  ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(store.createReviewQuestion).toHaveBeenCalledWith('job-1', {
      roundLabel: '复面',
      customRound: null,
      questionText: '如何优化首屏性能？',
    })
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('keeps the question text when saving fails', async () => {
    store.createReviewQuestion.mockRejectedValueOnce(new Error('保存失败'))
    const wrapper = mount(InterviewQuestionReviewView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          BaseButton: false,
          BaseInput: false,
        },
      },
    })
    await flushPromises()
    await wrapper.get('textarea').setValue('系统设计题')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('系统设计题')
    expect(wrapper.text()).toContain('保存失败')
  })
})
