import { z } from 'zod'

/**
 * Schemas are the single source of truth for the wire format. Types used by
 * the rest of the module are inferred from these schemas via `z.infer`.
 */

export const ResumeFileTypeSchema = z.enum(['pdf', 'docx'])

export const JobSearchIdSchema = z.object({
  id: z.string().min(1),
})

export const ResumeUploadMetadataSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  targetRole: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const ResumeListQuerySchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  targetRole: z.string().trim().max(120).optional(),
})

export const ResumeUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    targetRole: z.string().trim().max(120).nullable().optional(),
    contentText: z.string().trim().min(1).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.targetRole !== undefined ||
      value.contentText !== undefined ||
      value.notes !== undefined,
    { message: 'At least one resume field is required' },
  )

export const ResumeSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetRole: z.string().nullable(),
  sourceFileName: z.string(),
  sourceFileType: ResumeFileTypeSchema,
  sourceFilePath: z.string(),
  sourceFileSize: z.number().int().nonnegative(),
  extractedText: z.string(),
  contentText: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ApplicationStatusCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().trim().max(40).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const ApplicationStatusUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().trim().max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.color !== undefined || value.sortOrder !== undefined,
    { message: 'At least one status field is required' },
  )

export const ApplicationStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  sortOrder: z.number().int(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const JobPostListQuerySchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  statusId: z.string().trim().min(1).optional(),
  jobDirection: z.string().trim().max(120).optional(),
})

export const JobPostCreateSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().min(1).max(160),
  jobDirection: z.string().trim().min(1).max(120),
  city: z.string().trim().max(80).optional(),
  salaryRange: z.string().trim().max(80).optional(),
  sourcePlatform: z.string().trim().max(80).optional(),
  jobUrl: z.string().trim().url().max(1000).optional(),
  jdText: z.string().trim().min(1),
  statusId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(4000).optional(),
})

export const JobPostUpdateSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120).optional(),
    jobTitle: z.string().trim().min(1).max(160).optional(),
    jobDirection: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().max(80).nullable().optional(),
    salaryRange: z.string().trim().max(80).nullable().optional(),
    sourcePlatform: z.string().trim().max(80).nullable().optional(),
    jobUrl: z.string().trim().url().max(1000).nullable().optional(),
    jdText: z.string().trim().min(1).optional(),
    statusId: z.string().trim().min(1).nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.companyName !== undefined ||
      value.jobTitle !== undefined ||
      value.jobDirection !== undefined ||
      value.city !== undefined ||
      value.salaryRange !== undefined ||
      value.sourcePlatform !== undefined ||
      value.jobUrl !== undefined ||
      value.jdText !== undefined ||
      value.statusId !== undefined ||
      value.notes !== undefined,
    { message: 'At least one job field is required' },
  )

export const JobPostSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  jobDirection: z.string(),
  city: z.string().nullable(),
  salaryRange: z.string().nullable(),
  sourcePlatform: z.string().nullable(),
  jobUrl: z.string().nullable(),
  jdText: z.string(),
  statusId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const JobPostParseSchema = z.object({
  jdText: z.string().trim().min(20),
})

export const JobPostParsedSchema = z.object({
  companyName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  jobDirection: z.string().nullable(),
  city: z.string().nullable(),
  salaryRange: z.string().nullable(),
  sourcePlatform: z.string().nullable(),
  jobUrl: z.string().nullable(),
  notes: z.string().nullable(),
})

export const JobPostImageExtractedSchema = z.object({
  jdText: z.string(),
})

export const GreetingStyleSchema = z.enum(['concise-natural']).default('concise-natural')

export const GreetingGenerateSchema = z.object({
  jobPostId: z.string().min(1),
  resumeId: z.string().min(1),
  style: GreetingStyleSchema.optional(),
})

export const GreetingDraftSchema = z.object({
  id: z.string(),
  jobPostId: z.string(),
  jobSnapshot: JobPostSchema,
  content: z.string(),
  style: z.string().nullable(),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.string(),
})

export const TailoredResumeGenerateSchema = z.object({
  resumeId: z.string().min(1),
  jobPostId: z.string().min(1),
})

export const TailoredResumeSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  jobPostId: z.string(),
  resumeSnapshot: ResumeSchema,
  jobSnapshot: JobPostSchema,
  content: z.string(),
  changeNotes: z.string(),
  riskNotes: z.string(),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.string(),
})

export const RequirementAnalysisGenerateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  jobPostIds: z.array(z.string().min(1)).min(2).max(30),
})

export const RequirementGroupSchema = z.object({
  jobDirection: z.string(),
  jobPostCount: z.number().int().nonnegative(),
  commonSkills: z.array(z.string()),
  commonExperience: z.array(z.string()),
  commonTools: z.array(z.string()),
  softRequirements: z.array(z.string()),
  niceToHave: z.array(z.string()),
  riskNotes: z.array(z.string()),
})

export const RequirementGroupedResultSchema = z.object({
  groups: z.array(RequirementGroupSchema),
})

export const RequirementAnalysisSchema = z.object({
  id: z.string(),
  title: z.string(),
  jobPostIds: z.array(z.string()),
  groupedResult: RequirementGroupedResultSchema,
  summary: z.string(),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
  createdAt: z.string(),
})

export type JobSearchIdParam = z.infer<typeof JobSearchIdSchema>
export type ApplicationStatusCreateInput = z.infer<typeof ApplicationStatusCreateSchema>
export type ApplicationStatusUpdateInput = z.infer<typeof ApplicationStatusUpdateSchema>
export type GreetingDraftDto = z.infer<typeof GreetingDraftSchema>
export type GreetingGenerateInput = z.infer<typeof GreetingGenerateSchema>
export type GreetingStyle = z.infer<typeof GreetingStyleSchema>
export type JobPostCreateInput = z.infer<typeof JobPostCreateSchema>
export type JobPostListQuery = z.infer<typeof JobPostListQuerySchema>
export type JobPostParsedDto = z.infer<typeof JobPostParsedSchema>
export type JobPostImageExtractedDto = z.infer<typeof JobPostImageExtractedSchema>
export type JobPostParseInput = z.infer<typeof JobPostParseSchema>
export type JobPostUpdateInput = z.infer<typeof JobPostUpdateSchema>
export type ResumeFileType = z.infer<typeof ResumeFileTypeSchema>
export type ResumeListQuery = z.infer<typeof ResumeListQuerySchema>
export type ResumeUploadMetadata = z.infer<typeof ResumeUploadMetadataSchema>
export type ResumeUpdateInput = z.infer<typeof ResumeUpdateSchema>
export type ResumeDto = z.infer<typeof ResumeSchema>
export type TailoredResumeDto = z.infer<typeof TailoredResumeSchema>
export type TailoredResumeGenerateInput = z.infer<typeof TailoredResumeGenerateSchema>
export type RequirementAnalysisDto = z.infer<typeof RequirementAnalysisSchema>
export type RequirementAnalysisGenerateInput = z.infer<typeof RequirementAnalysisGenerateSchema>
export type RequirementGroupedResult = z.infer<typeof RequirementGroupedResultSchema>
