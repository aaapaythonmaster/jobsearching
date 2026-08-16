import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { interviewPrepApi } from '../api'
import { useInterviewPrepStore } from './index'

vi.mock('../api', () => ({
  interviewPrepApi: {
    listProjects: vi.fn(),
    listQuestions: vi.fn(),
    createQuestion: vi.fn(),
  },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('interview review store', () => {
  it('loads project overviews and questions independently', async () => {
    vi.mocked(interviewPrepApi.listProjects).mockResolvedValue([
      {
        jobPostId: 'job-1',
        companyName: '星海',
        jobTitle: '前端',
        questionCount: 1,
        latestQuestionAt: null,
      },
    ])
    vi.mocked(interviewPrepApi.listQuestions).mockResolvedValue([])
    const store = useInterviewPrepStore()

    await Promise.all([store.loadReviewProjects(), store.loadReviewQuestions('job-1')])

    expect(store.projects).toHaveLength(1)
    expect(store.reviewQuestions).toEqual([])
    expect(store.reviewError).toBeNull()
  })

  it('prepends a saved question without changing the existing preparation summary', async () => {
    const question = {
      id: 'question-1',
      jobPostId: 'job-1',
      roundLabel: '初面' as const,
      customRound: null,
      questionText: 'Vue 响应式原理？',
      userAnswer: null,
      notes: null,
      createdAt: '2026-08-16T12:00:00.000Z',
      updatedAt: '2026-08-16T12:00:00.000Z',
    }
    vi.mocked(interviewPrepApi.createQuestion).mockResolvedValue(question)
    const store = useInterviewPrepStore()

    await store.createReviewQuestion('job-1', {
      roundLabel: '初面',
      customRound: null,
      questionText: question.questionText,
    })

    expect(store.reviewQuestions).toEqual([question])
    expect(store.summary).toBeNull()
  })
})
