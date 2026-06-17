import type { FastifyReply, FastifyRequest } from 'fastify'
import { BadRequestError } from '@/utils/http-error'
import { success } from '@/utils/response'
import { jobSearchService } from './job-search.service'
import {
  ApplicationStatusCreateSchema,
  ApplicationStatusUpdateSchema,
  GreetingGenerateSchema,
  JobPostCreateSchema,
  JobPostListQuerySchema,
  JobPostParseSchema,
  JobPostUpdateSchema,
  JobSearchIdSchema,
  RequirementAnalysisGenerateSchema,
  ResumeListQuerySchema,
  ResumeUpdateSchema,
  ResumeUploadMetadataSchema,
  TailoredResumeGenerateSchema,
} from './job-search.schema'

/**
 * Controllers parse `req` with zod, delegate to the service, and wrap the
 * result with `success()`. They MUST NOT contain business logic.
 */
export const jobSearchController = {
  async listStatuses(_req: FastifyRequest, reply: FastifyReply) {
    const data = await jobSearchService.listStatuses()
    return reply.send(success(data))
  },

  async createStatus(req: FastifyRequest, reply: FastifyReply) {
    const input = ApplicationStatusCreateSchema.parse(req.body)
    const data = await jobSearchService.createStatus(input)
    return reply.status(201).send(success(data, 'created'))
  },

  async updateStatus(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const input = ApplicationStatusUpdateSchema.parse(req.body)
    const data = await jobSearchService.updateStatus(id, input)
    return reply.send(success(data, 'updated'))
  },

  async removeStatus(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.removeStatus(id)
    return reply.send(success(data, 'deleted'))
  },

  async listJobPosts(req: FastifyRequest, reply: FastifyReply) {
    const query = JobPostListQuerySchema.parse(req.query)
    const data = await jobSearchService.listJobPosts(query)
    return reply.send(success(data))
  },

  async getJobPost(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.getJobPost(id)
    return reply.send(success(data))
  },

  async createJobPost(req: FastifyRequest, reply: FastifyReply) {
    const input = JobPostCreateSchema.parse(req.body)
    const data = await jobSearchService.createJobPost(input)
    return reply.status(201).send(success(data, 'created'))
  },

  async parseJobPost(req: FastifyRequest, reply: FastifyReply) {
    const input = JobPostParseSchema.parse(req.body)
    const data = await jobSearchService.parseJobPost(input)
    return reply.send(success(data, 'parsed'))
  },

  async extractJobPostImage(req: FastifyRequest, reply: FastifyReply) {
    if (!req.isMultipart()) throw BadRequestError('Expected multipart/form-data')
    const file = await req.file()
    if (!file) throw BadRequestError('JD screenshot is required')

    const buffer = await file.toBuffer()
    const data = await jobSearchService.extractJobPostImage({
      fileName: file.filename,
      mimeType: file.mimetype,
      size: buffer.length,
      buffer,
    })
    return reply.send(success(data, 'extracted'))
  },

  async updateJobPost(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const input = JobPostUpdateSchema.parse(req.body)
    const data = await jobSearchService.updateJobPost(id, input)
    return reply.send(success(data, 'updated'))
  },

  async removeJobPost(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.removeJobPost(id)
    return reply.send(success(data, 'deleted'))
  },

  async listGreetingDrafts(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.listGreetingDrafts(id)
    return reply.send(success(data))
  },

  async generateGreeting(req: FastifyRequest, reply: FastifyReply) {
    const input = GreetingGenerateSchema.parse(req.body)
    const data = await jobSearchService.generateGreeting(input)
    return reply.status(201).send(success(data, 'generated'))
  },

  async listTailoredResumesByJobPost(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.listTailoredResumesByJobPost(id)
    return reply.send(success(data))
  },

  async generateTailoredResume(req: FastifyRequest, reply: FastifyReply) {
    const input = TailoredResumeGenerateSchema.parse(req.body)
    const data = await jobSearchService.generateTailoredResume(input)
    return reply.status(201).send(success(data, 'generated'))
  },

  async listRequirementAnalyses(_req: FastifyRequest, reply: FastifyReply) {
    const data = await jobSearchService.listRequirementAnalyses()
    return reply.send(success(data))
  },

  async getRequirementAnalysis(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.getRequirementAnalysis(id)
    return reply.send(success(data))
  },

  async generateRequirementAnalysis(req: FastifyRequest, reply: FastifyReply) {
    const input = RequirementAnalysisGenerateSchema.parse(req.body)
    const data = await jobSearchService.generateRequirementAnalysis(input)
    return reply.status(201).send(success(data, 'generated'))
  },

  async listResumes(req: FastifyRequest, reply: FastifyReply) {
    const query = ResumeListQuerySchema.parse(req.query)
    const data = await jobSearchService.listResumes(query)
    return reply.send(success(data))
  },

  async getResume(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.getResume(id)
    return reply.send(success(data))
  },

  async uploadResume(req: FastifyRequest, reply: FastifyReply) {
    if (!req.isMultipart()) throw BadRequestError('Expected multipart/form-data')
    const file = await req.file()
    if (!file) throw BadRequestError('Resume file is required')

    const metadata = ResumeUploadMetadataSchema.parse({
      name: multipartField(file.fields.name),
      targetRole: multipartField(file.fields.targetRole),
      notes: multipartField(file.fields.notes),
    })
    const buffer = await file.toBuffer()
    const data = await jobSearchService.uploadResume({
      fileName: file.filename,
      mimeType: file.mimetype,
      size: buffer.length,
      buffer,
      metadata,
    })
    return reply.status(201).send(success(data, 'uploaded'))
  },

  async updateResume(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const input = ResumeUpdateSchema.parse(req.body)
    const data = await jobSearchService.updateResume(id, input)
    return reply.send(success(data, 'updated'))
  },

  async removeResume(req: FastifyRequest, reply: FastifyReply) {
    const { id } = JobSearchIdSchema.parse(req.params)
    const data = await jobSearchService.removeResume(id)
    return reply.send(success(data, 'deleted'))
  },
}

function multipartField(value: unknown): string | undefined {
  if (!value || Array.isArray(value)) return undefined
  if (typeof value === 'object' && 'type' in value && value.type === 'field' && 'value' in value) {
    return typeof value.value === 'string' ? value.value : undefined
  }
  return undefined
}
