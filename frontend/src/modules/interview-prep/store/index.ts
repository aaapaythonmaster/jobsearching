import { defineStore } from 'pinia'
import { ref } from 'vue'
import { interviewPrepApi } from '../api'
import type {
  InterviewFaq,
  InterviewQuestion,
  InterviewQuestionCreateInput,
  ProjectSummary,
} from '../types'

export const useInterviewPrepStore = defineStore('interview-prep', () => {
  const summary = ref<ProjectSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  return { summary, loading, error, load, bindResume, createQuestion, upsertQuestion, addFaq }
})
