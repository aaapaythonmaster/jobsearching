import type { z } from 'zod'
import type {
  AnswerVersionSchema,
  FaqItem,
  InterviewFaqSchema,
  InterviewPrepSchema,
  InterviewQuestionSchema,
  IntroVersionSchema,
  ResumeBindingSchema,
} from './interview-prep.schema'

export type InterviewPrep = z.infer<typeof InterviewPrepSchema>
export type AnswerVersion = z.infer<typeof AnswerVersionSchema>
export type InterviewFaq = z.infer<typeof InterviewFaqSchema>
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>
export type IntroVersion = z.infer<typeof IntroVersionSchema>
export type ResumeBinding = z.infer<typeof ResumeBindingSchema>

export interface ResumeLite {
  id: string
  name: string
  targetRole: string | null
  contentText: string
}

export interface JobPostLite {
  id: string
  companyName: string
  jobTitle: string
  jobDirection: string
  city: string | null
  salaryRange: string | null
  jdText: string
  notes: string | null
}

export interface ResumeBindingRow {
  job_post_id: string
  resume_id: string
  created_at: string | Date
  updated_at: string | Date
}

export interface InterviewQuestionRow {
  id: string
  job_post_id: string
  round_label: string
  custom_round: string | null
  question_text: string
  user_answer: string | null
  notes: string | null
  created_at: string | Date
  updated_at: string | Date
}

export interface AnswerVersionRow {
  id: string
  question_id: string
  job_post_id: string
  user_answer_snapshot: string | null
  analysis: string
  reference_answer: string
  model_name: string | null
  prompt_version: string | null
  created_at: string | Date
}

export interface IntroVersionRow {
  id: string
  job_post_id: string
  resume_id: string
  duration_label: string
  custom_duration_minutes: number | null
  content: string
  model_name: string | null
  prompt_version: string | null
  created_at: string | Date
}

export interface InterviewFaqRow {
  id: string
  job_post_id: string
  resume_id: string | null
  type: string
  title: string
  items: string
  model_name: string | null
  prompt_version: string | null
  created_at: string | Date
}

export interface FaqSourceRow {
  faq_id: string
  question_id: string
}

export interface FaqCreateRecord {
  id: string
  jobPostId: string
  resumeId: string | null
  type: 'summary' | 'deep'
  title: string
  items: FaqItem[]
  sourceQuestionIds: string[]
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}
