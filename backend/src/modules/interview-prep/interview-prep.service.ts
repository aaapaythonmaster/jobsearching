import { env } from '@/config/env'
import { BadRequestError, NotFoundError } from '@/utils/http-error'
import { nanoid } from '@/utils/id'
import { generateText } from './interview-prep.ai'
import { interviewPrepRepository } from './interview-prep.repository'
import type {
  AnswerReviewGenerateInput,
  AnswerVersionDto,
  DeepFaqGenerateInput,
  FaqItem,
  IntroGenerateInput,
  IntroVersionDto,
  InterviewFaqDto,
  InterviewQuestionCreateInput,
  InterviewQuestionDto,
  InterviewQuestionUpdateInput,
  ProjectSummaryDto,
  ResumeBindingDto,
  ResumeBindingUpsertInput,
  SummaryFaqGenerateInput,
} from './interview-prep.schema'
import type { JobPostLite, ResumeLite } from './interview-prep.types'

export const interviewPrepService = {
  async getProjectSummary(jobPostId: string): Promise<ProjectSummaryDto> {
    const jobPost = await ensureJobPost(jobPostId)
    const [binding, resumeOptions, questions, intros, faqs] = await Promise.all([
      interviewPrepRepository.findBinding(jobPostId),
      interviewPrepRepository.listResumeOptions(),
      interviewPrepRepository.listQuestions(jobPostId),
      interviewPrepRepository.listIntroVersions(jobPostId),
      interviewPrepRepository.listFaqs(jobPostId),
    ])
    return {
      jobPost: {
        id: jobPost.id,
        companyName: jobPost.companyName,
        jobTitle: jobPost.jobTitle,
        jobDirection: jobPost.jobDirection,
        city: jobPost.city,
        salaryRange: jobPost.salaryRange,
      },
      binding,
      resumeOptions,
      questions,
      intros,
      faqs,
    }
  },

  async bindResume(jobPostId: string, input: ResumeBindingUpsertInput): Promise<ResumeBindingDto> {
    await ensureJobPost(jobPostId)
    await ensureResume(input.resumeId)
    return interviewPrepRepository.upsertBinding(jobPostId, input.resumeId, now())
  },

  async listQuestions(jobPostId: string): Promise<InterviewQuestionDto[]> {
    await ensureJobPost(jobPostId)
    return interviewPrepRepository.listQuestions(jobPostId)
  },

  async createQuestion(
    jobPostId: string,
    input: InterviewQuestionCreateInput,
  ): Promise<InterviewQuestionDto> {
    await ensureJobPost(jobPostId)
    return interviewPrepRepository.createQuestion(nanoid(), jobPostId, normalizeQuestionInput(input), now())
  },

  async updateQuestion(
    questionId: string,
    input: InterviewQuestionUpdateInput,
  ): Promise<InterviewQuestionDto> {
    const question = await interviewPrepRepository.findQuestionById(questionId)
    if (!question) throw NotFoundError('interview question')
    const updated = await interviewPrepRepository.updateQuestion(questionId, normalizeQuestionInput(input), now())
    if (!updated) throw NotFoundError('interview question')
    return updated
  },

  async removeQuestion(questionId: string): Promise<{ id: string }> {
    const ok = await interviewPrepRepository.removeQuestion(questionId)
    if (!ok) throw NotFoundError('interview question')
    return { id: questionId }
  },

  async listAnswerVersions(questionId: string): Promise<AnswerVersionDto[]> {
    const question = await interviewPrepRepository.findQuestionById(questionId)
    if (!question) throw NotFoundError('interview question')
    return interviewPrepRepository.listAnswerVersions(questionId)
  },

  async reviewAnswer(
    questionId: string,
    input: AnswerReviewGenerateInput,
  ): Promise<AnswerVersionDto> {
    const question = await interviewPrepRepository.findQuestionById(questionId)
    if (!question) throw NotFoundError('interview question')
    const jobPost = await ensureJobPost(question.jobPostId)
    const userAnswer = input.userAnswer ?? question.userAnswer
    const generated = await generateText({
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            '你是中文面试辅导助手。必须基于岗位 JD、面试问题和用户回答生成建议。输出合法 JSON，不要 Markdown。',
        },
        {
          role: 'user',
          content: buildAnswerReviewPrompt(jobPost, question.questionText, userAnswer),
        },
      ],
    })
    const parsed = parseAnswerReview(generated)
    const version: AnswerVersionDto = {
      id: nanoid(),
      questionId: question.id,
      jobPostId: question.jobPostId,
      userAnswerSnapshot: userAnswer ?? null,
      analysis: parsed.analysis,
      referenceAnswer: parsed.referenceAnswer,
      modelName: env.AI_MODEL,
      promptVersion: 'interview-answer-v1',
      createdAt: now(),
    }
    return interviewPrepRepository.createAnswerVersion(version)
  },

  async listIntroVersions(jobPostId: string): Promise<IntroVersionDto[]> {
    await ensureJobPost(jobPostId)
    return interviewPrepRepository.listIntroVersions(jobPostId)
  },

  async generateIntro(jobPostId: string, input: IntroGenerateInput): Promise<IntroVersionDto> {
    const jobPost = await ensureJobPost(jobPostId)
    const resume = await resolveResume(jobPostId, input.resumeId)
    const generated = await generateText({
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            '你是中文求职面试辅导助手。基于 JD 和简历生成真实、自然、有重点的中文自我介绍，不要编造经历。',
        },
        {
          role: 'user',
          content: buildIntroPrompt(jobPost, resume, input),
        },
      ],
    })
    const intro: IntroVersionDto = {
      id: nanoid(),
      jobPostId,
      resumeId: resume.id,
      durationLabel: input.durationLabel,
      customDurationMinutes: input.customDurationMinutes ?? null,
      content: generated,
      modelName: env.AI_MODEL,
      promptVersion: 'interview-intro-v1',
      createdAt: now(),
    }
    return interviewPrepRepository.createIntroVersion(intro)
  },

  async listFaqs(jobPostId: string): Promise<InterviewFaqDto[]> {
    await ensureJobPost(jobPostId)
    return interviewPrepRepository.listFaqs(jobPostId)
  },

  async getFaq(faqId: string): Promise<InterviewFaqDto> {
    const faq = await interviewPrepRepository.findFaqById(faqId)
    if (!faq) throw NotFoundError('interview faq')
    return faq
  },

  async generateSummaryFaq(
    jobPostId: string,
    input: SummaryFaqGenerateInput,
  ): Promise<InterviewFaqDto> {
    const jobPost = await ensureJobPost(jobPostId)
    const resume = input.resumeId ? await ensureResume(input.resumeId) : await resolveOptionalResume(jobPostId)
    const questions = await interviewPrepRepository.findQuestionsByIds([...new Set(input.questionIds)])
    if (questions.length !== new Set(input.questionIds).size) throw NotFoundError('interview question')
    if (questions.some((question) => question.jobPostId !== jobPostId)) {
      throw BadRequestError('questions must belong to the same job post')
    }
    const generated = await generateText({
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content:
            '你是中文面试 FAQ 整理助手。输出合法 JSON，不要 Markdown。不要编造真实问题中不存在的信息。',
        },
        {
          role: 'user',
          content: buildSummaryFaqPrompt(jobPost, resume, questions),
        },
      ],
    })
    const items = parseFaqItems(generated, questions.map((question) => question.id))
    return interviewPrepRepository.createFaq({
      id: nanoid(),
      jobPostId,
      resumeId: resume?.id ?? null,
      type: 'summary',
      title: input.title ?? '真实面试问题总结 FAQ',
      items,
      sourceQuestionIds: questions.map((question) => question.id),
      modelName: env.AI_MODEL,
      promptVersion: 'interview-summary-faq-v1',
      createdAt: now(),
    })
  },

  async generateDeepFaq(jobPostId: string, input: DeepFaqGenerateInput): Promise<InterviewFaqDto> {
    const jobPost = await ensureJobPost(jobPostId)
    const resume = input.resumeId ? await ensureResume(input.resumeId) : await resolveResume(jobPostId)
    const generated = await generateText({
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            '你是中文岗位面试深挖题生成助手。基于 JD 和简历生成可能被追问的问题。输出合法 JSON，不要 Markdown。',
        },
        {
          role: 'user',
          content: buildDeepFaqPrompt(jobPost, resume),
        },
      ],
    })
    return interviewPrepRepository.createFaq({
      id: nanoid(),
      jobPostId,
      resumeId: resume.id,
      type: 'deep',
      title: input.title ?? '岗位深挖 FAQ',
      items: parseFaqItems(generated, []),
      sourceQuestionIds: [],
      modelName: env.AI_MODEL,
      promptVersion: 'interview-deep-faq-v1',
      createdAt: now(),
    })
  },
}

async function ensureJobPost(jobPostId: string): Promise<JobPostLite> {
  const jobPost = await interviewPrepRepository.findJobPostById(jobPostId)
  if (!jobPost) throw NotFoundError('job post')
  return jobPost
}

async function ensureResume(resumeId: string): Promise<ResumeLite> {
  const resume = await interviewPrepRepository.findResumeById(resumeId)
  if (!resume) throw NotFoundError('resume')
  return resume
}

async function resolveResume(jobPostId: string, resumeId?: string): Promise<ResumeLite> {
  if (resumeId) return ensureResume(resumeId)
  const binding = await interviewPrepRepository.findBinding(jobPostId)
  if (!binding) throw BadRequestError('please bind a resume first')
  return ensureResume(binding.resumeId)
}

async function resolveOptionalResume(jobPostId: string): Promise<ResumeLite | null> {
  const binding = await interviewPrepRepository.findBinding(jobPostId)
  return binding ? ensureResume(binding.resumeId) : null
}

function normalizeQuestionInput<T extends InterviewQuestionCreateInput | InterviewQuestionUpdateInput>(
  input: T,
): T {
  return {
    ...input,
    customRound: input.roundLabel === '其他' ? input.customRound ?? null : null,
  }
}

function now(): string {
  return new Date().toISOString()
}

function buildAnswerReviewPrompt(
  jobPost: JobPostLite,
  question: string,
  userAnswer: string | null | undefined,
): string {
  return JSON.stringify({
    output: {
      analysis: '如果有用户回答，分析优点、问题、改进建议；如果没有回答，说明暂无用户回答并给答题建议。',
      referenceAnswer: '给出详细中文参考回答',
    },
    job: jobPost,
    question,
    userAnswer: userAnswer || null,
  })
}

function buildIntroPrompt(jobPost: JobPostLite, resume: ResumeLite, input: IntroGenerateInput): string {
  return JSON.stringify({
    duration: input.durationLabel === '自定义' ? `${input.customDurationMinutes ?? 3} 分钟` : input.durationLabel,
    job: jobPost,
    resume,
    rules: ['中文输出', '结构自然', '突出 JD 匹配点', '不编造经历', '只输出自我介绍正文'],
  })
}

function buildSummaryFaqPrompt(
  jobPost: JobPostLite,
  resume: ResumeLite | null,
  questions: InterviewQuestionDto[],
): string {
  return JSON.stringify({
    output: {
      items: [
        {
          question: '问题',
          scenario: '适用场景',
          answerApproach: '回答思路',
          referenceAnswer: '详细参考回答',
          sourceQuestionIds: ['来源问题 id'],
        },
      ],
    },
    job: jobPost,
    resume,
    questions,
  })
}

function buildDeepFaqPrompt(jobPost: JobPostLite, resume: ResumeLite): string {
  return JSON.stringify({
    output: {
      items: [
        {
          question: '深挖问题',
          scenario: '考察点',
          answerApproach: '回答思路',
          referenceAnswer: '详细参考回答',
          sourceQuestionIds: [],
        },
      ],
    },
    job: jobPost,
    resume,
    count: 8,
  })
}

function parseAnswerReview(raw: string): { analysis: string; referenceAnswer: string } {
  const parsed = tryJson(raw) as Partial<{ analysis: string; referenceAnswer: string }> | null
  return {
    analysis: text(parsed?.analysis) || '未返回明确分析。',
    referenceAnswer: text(parsed?.referenceAnswer) || raw,
  }
}

function parseFaqItems(raw: string, fallbackQuestionIds: string[]): FaqItem[] {
  const parsed = tryJson(raw) as Partial<{ items: FaqItem[] }> | FaqItem[] | null
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : []
  const normalized = items
    .map((item) => ({
      question: text(item.question),
      scenario: text(item.scenario),
      answerApproach: text(item.answerApproach),
      referenceAnswer: text(item.referenceAnswer),
      sourceQuestionIds: Array.isArray(item.sourceQuestionIds) ? item.sourceQuestionIds : fallbackQuestionIds,
    }))
    .filter((item) => item.question && item.referenceAnswer)
  if (normalized.length > 0) return normalized
  return [
    {
      question: '面试准备参考',
      scenario: '当前岗位面试',
      answerApproach: '结合 JD 和简历，先讲结论，再讲经历证据，最后回到岗位价值。',
      referenceAnswer: raw,
      sourceQuestionIds: fallbackQuestionIds,
    },
  ]
}

function tryJson(raw: string): unknown | null {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
