import { z } from 'zod'

export const InterviewPrepSchema = z.object({
  id: z.string(),
})

export const JobPostIdSchema = z.object({
  jobPostId: z.string().min(1),
})

export const QuestionIdSchema = z.object({
  questionId: z.string().min(1),
})

export const FaqIdSchema = z.object({
  faqId: z.string().min(1),
})

export const RoundLabelSchema = z.enum(['初面', '复面', '终面', 'HR 面', '笔试', '其他'])
export const IntroDurationSchema = z.enum(['2 分钟', '3 分钟', '5 分钟', '自定义'])
export const FaqTypeSchema = z.enum(['summary', 'deep'])

export const InterviewProjectOverviewSchema = z.object({
  jobPostId: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  questionCount: z.number().int().nonnegative(),
  latestQuestionAt: z.string().nullable(),
})

export const ResumeBindingUpsertSchema = z.object({
  resumeId: z.string().min(1),
})

export const ResumeBindingSchema = z.object({
  jobPostId: z.string(),
  resumeId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const JobPostOptionSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  jobDirection: z.string(),
  city: z.string().nullable(),
  salaryRange: z.string().nullable(),
})

export const ResumeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetRole: z.string().nullable(),
})

export const InterviewQuestionCreateSchema = z.object({
  roundLabel: RoundLabelSchema,
  customRound: z.string().trim().max(80).nullable().optional(),
  questionText: z.string().trim().min(1).max(4000),
  userAnswer: z.string().trim().max(8000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
})

export const InterviewQuestionUpdateSchema = z
  .object({
    roundLabel: RoundLabelSchema.optional(),
    customRound: z.string().trim().max(80).nullable().optional(),
    questionText: z.string().trim().min(1).max(4000).optional(),
    userAnswer: z.string().trim().max(8000).nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.roundLabel !== undefined ||
      value.customRound !== undefined ||
      value.questionText !== undefined ||
      value.userAnswer !== undefined ||
      value.notes !== undefined,
    { message: 'At least one question field is required' },
  )

export const InterviewQuestionSchema = z.object({
  id: z.string(),
  jobPostId: z.string(),
  roundLabel: RoundLabelSchema,
  customRound: z.string().nullable(),
  questionText: z.string(),
  userAnswer: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const AnswerReviewGenerateSchema = z.object({
  userAnswer: z.string().trim().max(8000).nullable().optional(),
})

export const AnswerVersionSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  jobPostId: z.string(),
  userAnswerSnapshot: z.string().nullable(),
  analysis: z.string(),
  referenceAnswer: z.string(),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.string(),
})

export const IntroGenerateSchema = z.object({
  resumeId: z.string().min(1).optional(),
  durationLabel: IntroDurationSchema,
  customDurationMinutes: z.number().int().min(1).max(20).nullable().optional(),
})

export const IntroVersionSchema = z.object({
  id: z.string(),
  jobPostId: z.string(),
  resumeId: z.string(),
  durationLabel: IntroDurationSchema,
  customDurationMinutes: z.number().int().nullable(),
  content: z.string(),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.string(),
})

export const SummaryFaqGenerateSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(30),
  resumeId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160).optional(),
})

export const DeepFaqGenerateSchema = z.object({
  resumeId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160).optional(),
})

export const FaqItemSchema = z.object({
  question: z.string(),
  scenario: z.string(),
  answerApproach: z.string(),
  referenceAnswer: z.string(),
  sourceQuestionIds: z.array(z.string()),
})

export const InterviewFaqSchema = z.object({
  id: z.string(),
  jobPostId: z.string(),
  resumeId: z.string().nullable(),
  type: FaqTypeSchema,
  title: z.string(),
  items: z.array(FaqItemSchema),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.string(),
})

export const ProjectSummarySchema = z.object({
  jobPost: JobPostOptionSchema,
  binding: ResumeBindingSchema.nullable(),
  resumeOptions: z.array(ResumeOptionSchema),
  questions: z.array(InterviewQuestionSchema),
  intros: z.array(IntroVersionSchema),
  faqs: z.array(InterviewFaqSchema),
})

export type AnswerReviewGenerateInput = z.infer<typeof AnswerReviewGenerateSchema>
export type AnswerVersionDto = z.infer<typeof AnswerVersionSchema>
export type DeepFaqGenerateInput = z.infer<typeof DeepFaqGenerateSchema>
export type FaqItem = z.infer<typeof FaqItemSchema>
export type FaqType = z.infer<typeof FaqTypeSchema>
export type IntroGenerateInput = z.infer<typeof IntroGenerateSchema>
export type IntroVersionDto = z.infer<typeof IntroVersionSchema>
export type InterviewFaqDto = z.infer<typeof InterviewFaqSchema>
export type InterviewQuestionCreateInput = z.infer<typeof InterviewQuestionCreateSchema>
export type InterviewQuestionDto = z.infer<typeof InterviewQuestionSchema>
export type InterviewQuestionUpdateInput = z.infer<typeof InterviewQuestionUpdateSchema>
export type InterviewProjectOverviewDto = z.infer<typeof InterviewProjectOverviewSchema>
export type ProjectSummaryDto = z.infer<typeof ProjectSummarySchema>
export type ResumeBindingDto = z.infer<typeof ResumeBindingSchema>
export type ResumeBindingUpsertInput = z.infer<typeof ResumeBindingUpsertSchema>
export type ResumeOptionDto = z.infer<typeof ResumeOptionSchema>
export type SummaryFaqGenerateInput = z.infer<typeof SummaryFaqGenerateSchema>
