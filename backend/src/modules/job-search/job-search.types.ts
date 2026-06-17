import type { z } from 'zod'
import type {
  ApplicationStatusSchema,
  GreetingDraftSchema,
  JobPostSchema,
  RequirementAnalysisSchema,
  RequirementGroupedResultSchema,
  ResumeSchema,
  TailoredResumeSchema,
} from './job-search.schema'

export type Resume = z.infer<typeof ResumeSchema>
export type JobPost = z.infer<typeof JobPostSchema>
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>
export type GreetingDraft = z.infer<typeof GreetingDraftSchema>
export type TailoredResume = z.infer<typeof TailoredResumeSchema>
export type RequirementAnalysis = z.infer<typeof RequirementAnalysisSchema>
export type RequirementGroupedResult = z.infer<typeof RequirementGroupedResultSchema>

export interface ResumeRow {
  id: string
  name: string
  target_role: string | null
  source_file_name: string
  source_file_type: string
  source_file_path: string
  source_file_size: number
  extracted_text: string
  content_text: string
  notes: string | null
  created_at: string | Date
  updated_at: string | Date
}

export interface ResumeCreateRecord {
  id: string
  name: string
  targetRole: string | null
  sourceFileName: string
  sourceFileType: 'pdf' | 'docx'
  sourceFilePath: string
  sourceFileSize: number
  extractedText: string
  contentText: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface JobPostRow {
  id: string
  company_name: string
  job_title: string
  job_direction: string
  city: string | null
  salary_range: string | null
  source_platform: string | null
  job_url: string | null
  jd_text: string
  status_id: string | null
  notes: string | null
  created_at: string | Date
  updated_at: string | Date
}

export interface JobPostCreateRecord {
  id: string
  companyName: string
  jobTitle: string
  jobDirection: string
  city: string | null
  salaryRange: string | null
  sourcePlatform: string | null
  jobUrl: string | null
  jdText: string
  statusId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationStatusRow {
  id: string
  name: string
  color: string | null
  sort_order: number
  is_default: number | boolean
  created_at: string | Date
  updated_at: string | Date
}

export interface ApplicationStatusCreateRecord {
  id: string
  name: string
  color: string | null
  sortOrder: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface GreetingDraftRow {
  id: string
  job_post_id: string
  job_snapshot: string
  content: string
  style: string | null
  model_name: string | null
  prompt_version: string | null
  created_at: string | Date
}

export interface GreetingDraftCreateRecord {
  id: string
  jobPostId: string
  jobSnapshot: JobPost
  content: string
  style: string | null
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface TailoredResumeRow {
  id: string
  resume_id: string
  job_post_id: string
  resume_snapshot: string
  job_snapshot: string
  content: string
  change_notes: string
  risk_notes: string
  model_name: string | null
  prompt_version: string | null
  created_at: string | Date
}

export interface TailoredResumeCreateRecord {
  id: string
  resumeId: string
  jobPostId: string
  resumeSnapshot: Resume
  jobSnapshot: JobPost
  content: string
  changeNotes: string
  riskNotes: string
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface RequirementAnalysisRow {
  id: string
  title: string
  job_post_ids: string
  grouped_result: string
  summary: string
  model_name: string | null
  prompt_version: string | null
  created_at: string | Date
}

export interface RequirementAnalysisCreateRecord {
  id: string
  title: string
  jobPostIds: string[]
  groupedResult: RequirementGroupedResult
  summary: string
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}
