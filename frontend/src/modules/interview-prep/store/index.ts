import { defineStore } from 'pinia'
import { ref } from 'vue'
import { interviewPrepApi } from '../api'
import type {
  InterviewFaq,
  InterviewProjectOverview,
  InterviewQuestion,
  InterviewQuestionCreateInput,
  ProjectSummary,
} from '../types'

export const useInterviewPrepStore = defineStore('interview-prep', () => {
  const summary = ref<ProjectSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const projects = ref<InterviewProjectOverview[]>([])
  const reviewQuestions = ref<InterviewQuestion[]>([])
  const reviewLoading = ref(false)
  const reviewError = ref<string | null>(null)
  let pendingReviewRequests = 0

  async function run<T>(work: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await work()
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function load(jobPostId: string) {
    summary.value = await run(() => interviewPrepApi.getProjectSummary(jobPostId))
  }

  async function runReview<T>(work: () => Promise<T>): Promise<T> {
    pendingReviewRequests += 1
    reviewLoading.value = true
    if (pendingReviewRequests === 1) reviewError.value = null
    try {
      return await work()
    } catch (e) {
      reviewError.value = (e as Error).message
      throw e
    } finally {
      pendingReviewRequests -= 1
      reviewLoading.value = pendingReviewRequests > 0
    }
  }

  async function loadReviewProjects() {
    projects.value = await runReview(() => interviewPrepApi.listProjects())
  }

  async function loadReviewQuestions(jobPostId: string) {
    reviewQuestions.value = await runReview(() => interviewPrepApi.listQuestions(jobPostId))
  }

  async function createReviewQuestion(jobPostId: string, input: InterviewQuestionCreateInput) {
    const question = await runReview(() => interviewPrepApi.createQuestion(jobPostId, input))
    reviewQuestions.value = [question, ...reviewQuestions.value]
    return question
  }

  async function bindResume(jobPostId: string, resumeId: string) {
    const binding = await run(() => interviewPrepApi.bindResume(jobPostId, resumeId))
    if (summary.value) summary.value.binding = binding
    return binding
  }

  async function createQuestion(jobPostId: string, input: InterviewQuestionCreateInput) {
    const question = await run(() => interviewPrepApi.createQuestion(jobPostId, input))
    if (summary.value) summary.value.questions = [question, ...summary.value.questions]
    return question
  }

  function upsertQuestion(question: InterviewQuestion) {
    if (!summary.value) return
    summary.value.questions = summary.value.questions.map((item) =>
      item.id === question.id ? question : item,
    )
  }

  function addFaq(faq: InterviewFaq) {
    if (!summary.value) return
    summary.value.faqs = [faq, ...summary.value.faqs]
  }

  return {
    summary,
    loading,
    error,
    projects,
    reviewQuestions,
    reviewLoading,
    reviewError,
    load,
    loadReviewProjects,
    loadReviewQuestions,
    createReviewQuestion,
    bindResume,
    createQuestion,
    upsertQuestion,
    addFaq,
  }
})
