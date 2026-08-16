import { http } from '@/utils/request'
import type {
  AnswerVersion,
  DeepFaqGenerateInput,
  InterviewFaq,
  InterviewProjectOverview,
  InterviewQuestion,
  InterviewQuestionCreateInput,
  InterviewQuestionUpdateInput,
  IntroGenerateInput,
  IntroVersion,
  ProjectSummary,
  ResumeBinding,
  SummaryFaqGenerateInput,
} from '../types'

export const interviewPrepApi = {
  listProjects: () => http.get<InterviewProjectOverview[]>('/interview-prep/projects'),
  getProjectSummary: (jobPostId: string) =>
    http.get<ProjectSummary>(`/interview-prep/projects/${jobPostId}/summary`),
  bindResume: (jobPostId: string, resumeId: string) =>
    http.put<ResumeBinding>(`/interview-prep/projects/${jobPostId}/resume-binding`, { resumeId }),
  listQuestions: (jobPostId: string) =>
    http.get<InterviewQuestion[]>(`/interview-prep/projects/${jobPostId}/questions`),
  createQuestion: (jobPostId: string, input: InterviewQuestionCreateInput) =>
    http.post<InterviewQuestion>(`/interview-prep/projects/${jobPostId}/questions`, input),
  updateQuestion: (questionId: string, input: InterviewQuestionUpdateInput) =>
    http.patch<InterviewQuestion>(`/interview-prep/questions/${questionId}`, input),
  removeQuestion: (questionId: string) =>
    http.delete<{ id: string }>(`/interview-prep/questions/${questionId}`),
  reviewAnswer: (questionId: string, userAnswer?: string | null) =>
    http.post<AnswerVersion>(`/interview-prep/questions/${questionId}/review-answer`, {
      userAnswer,
    }),
  generateIntro: (jobPostId: string, input: IntroGenerateInput) =>
    http.post<IntroVersion>(`/interview-prep/projects/${jobPostId}/generate-intro`, input),
  generateSummaryFaq: (jobPostId: string, input: SummaryFaqGenerateInput) =>
    http.post<InterviewFaq>(`/interview-prep/projects/${jobPostId}/generate-summary-faq`, input),
  generateDeepFaq: (jobPostId: string, input: DeepFaqGenerateInput = {}) =>
    http.post<InterviewFaq>(`/interview-prep/projects/${jobPostId}/generate-deep-faq`, input),
}
