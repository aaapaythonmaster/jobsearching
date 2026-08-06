import type { FastifyReply, FastifyRequest } from 'fastify'
import { success } from '@/utils/response'
import { interviewPrepService } from './interview-prep.service'
import {
  AnswerReviewGenerateSchema,
  DeepFaqGenerateSchema,
  FaqIdSchema,
  InterviewQuestionCreateSchema,
  InterviewQuestionUpdateSchema,
  IntroGenerateSchema,
  JobPostIdSchema,
  QuestionIdSchema,
  ResumeBindingUpsertSchema,
  SummaryFaqGenerateSchema,
} from './interview-prep.schema'

export const interviewPrepController = {
  async getProjectSummary(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const data = await interviewPrepService.getProjectSummary(jobPostId)
    return reply.send(success(data))
  },

  async bindResume(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const input = ResumeBindingUpsertSchema.parse(req.body)
    const data = await interviewPrepService.bindResume(jobPostId, input)
    return reply.send(success(data, 'bound'))
  },

  async listQuestions(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const data = await interviewPrepService.listQuestions(jobPostId)
    return reply.send(success(data))
  },

  async createQuestion(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const input = InterviewQuestionCreateSchema.parse(req.body)
    const data = await interviewPrepService.createQuestion(jobPostId, input)
    return reply.status(201).send(success(data, 'created'))
  },

  async updateQuestion(req: FastifyRequest, reply: FastifyReply) {
    const { questionId } = QuestionIdSchema.parse(req.params)
    const input = InterviewQuestionUpdateSchema.parse(req.body)
    const data = await interviewPrepService.updateQuestion(questionId, input)
    return reply.send(success(data, 'updated'))
  },

  async removeQuestion(req: FastifyRequest, reply: FastifyReply) {
    const { questionId } = QuestionIdSchema.parse(req.params)
    const data = await interviewPrepService.removeQuestion(questionId)
    return reply.send(success(data, 'deleted'))
  },

  async listAnswerVersions(req: FastifyRequest, reply: FastifyReply) {
    const { questionId } = QuestionIdSchema.parse(req.params)
    const data = await interviewPrepService.listAnswerVersions(questionId)
    return reply.send(success(data))
  },

  async reviewAnswer(req: FastifyRequest, reply: FastifyReply) {
    const { questionId } = QuestionIdSchema.parse(req.params)
    const input = AnswerReviewGenerateSchema.parse(req.body ?? {})
    const data = await interviewPrepService.reviewAnswer(questionId, input)
    return reply.status(201).send(success(data, 'generated'))
  },

  async listIntroVersions(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const data = await interviewPrepService.listIntroVersions(jobPostId)
    return reply.send(success(data))
  },

  async generateIntro(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const input = IntroGenerateSchema.parse(req.body)
    const data = await interviewPrepService.generateIntro(jobPostId, input)
    return reply.status(201).send(success(data, 'generated'))
  },

  async listFaqs(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const data = await interviewPrepService.listFaqs(jobPostId)
    return reply.send(success(data))
  },

  async getFaq(req: FastifyRequest, reply: FastifyReply) {
    const { faqId } = FaqIdSchema.parse(req.params)
    const data = await interviewPrepService.getFaq(faqId)
    return reply.send(success(data))
  },

  async generateSummaryFaq(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const input = SummaryFaqGenerateSchema.parse(req.body)
    const data = await interviewPrepService.generateSummaryFaq(jobPostId, input)
    return reply.status(201).send(success(data, 'generated'))
  },

  async generateDeepFaq(req: FastifyRequest, reply: FastifyReply) {
    const { jobPostId } = JobPostIdSchema.parse(req.params)
    const input = DeepFaqGenerateSchema.parse(req.body ?? {})
    const data = await interviewPrepService.generateDeepFaq(jobPostId, input)
    return reply.status(201).send(success(data, 'generated'))
  },
}
