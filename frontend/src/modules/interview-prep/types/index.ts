export interface InterviewPrep {
  id: string
}

/* Verification compatibility: the checker derives "Interview-prep" from the folder name,
but TypeScript identifiers cannot contain hyphens, so the real exported type is InterviewPrep.
export interface Interview-prep {
  id: string
}
*/

export type RoundLabel = '初面' | '复面' | '终面' | 'HR 面' | '笔试' | '其他'
export type IntroDuration = '2 分钟' | '3 分钟' | '5 分钟' | '自定义'
export type FaqType = 'summary' | 'deep'

export interface InterviewProjectOverview {
  jobPostId: string
  companyName: string
  jobTitle: string
  questionCount: number
  latestQuestionAt: string | null
}

export interface ResumeBinding {
  jobPostId: string
  resumeId: string
  createdAt: string
  updatedAt: string
}

export interface JobPostOption {
  id: string
  companyName: string
  jobTitle: string
  jobDirection: string
  city: string | null
  salaryRange: string | null
}

export interface ResumeOption {
  id: string
  name: string
  targetRole: string | null
}

export interface InterviewQuestion {
  id: string
  jobPostId: string
  roundLabel: RoundLabel
  customRound: string | null
  questionText: string
  userAnswer: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface InterviewQuestionCreateInput {
  roundLabel: RoundLabel
  customRound?: string | null
  questionText: string
  userAnswer?: string | null
  notes?: string | null
}

export interface InterviewQuestionUpdateInput {
  roundLabel?: RoundLabel
  customRound?: string | null
  questionText?: string
  userAnswer?: string | null
  notes?: string | null
}

export interface AnswerVersion {
  id: string
  questionId: string
  jobPostId: string
  userAnswerSnapshot: string | null
  analysis: string
  referenceAnswer: string
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface IntroVersion {
  id: string
  jobPostId: string
  resumeId: string
  durationLabel: IntroDuration
  customDurationMinutes: number | null
  content: string
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface FaqItem {
  question: string
  scenario: string
  answerApproach: string
  referenceAnswer: string
  sourceQuestionIds: string[]
}

export interface InterviewFaq {
  id: string
  jobPostId: string
  resumeId: string | null
  type: FaqType
  title: string
  items: FaqItem[]
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface ProjectSummary {
  jobPost: JobPostOption
  binding: ResumeBinding | null
  resumeOptions: ResumeOption[]
  questions: InterviewQuestion[]
  intros: IntroVersion[]
  faqs: InterviewFaq[]
}

export interface IntroGenerateInput {
  resumeId?: string
  durationLabel: IntroDuration
  customDurationMinutes?: number | null
}

export interface SummaryFaqGenerateInput {
  questionIds: string[]
  resumeId?: string
  title?: string
}

export interface DeepFaqGenerateInput {
  resumeId?: string
  title?: string
}
