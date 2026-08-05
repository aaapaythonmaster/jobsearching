import { http } from '@/utils/request'
import type {
  ApplicationStatus,
  ApplicationStatusCreateInput,
  ApplicationStatusUpdateInput,
  GreetingDraft,
  GreetingGenerateInput,
  JobPost,
  JobPostCreateInput,
  JobPostImageExtracted,
  JobPostParsed,
  JobPostParseInput,
  JobPostUpdateInput,
  RequirementAnalysis,
  RequirementAnalysisGenerateInput,
  Resume,
  ResumeUpdateInput,
  TailoredResume,
  TailoredResumeGenerateInput,
} from '../types'

export interface ResumeUploadInput {
  file: File
  name?: string
  targetRole?: string
  notes?: string
}

export interface ResumeListQuery {
  keyword?: string
  targetRole?: string
}

export interface JobPostListQuery {
  keyword?: string
  statusId?: string
  jobDirection?: string
}

function cleanQuery(query: object): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string | undefined>
}

export const jobSearchApi = {
  listResumes: (query: ResumeListQuery = {}) =>
    http.get<Resume[]>('/job-search/resumes', { query: cleanQuery(query) }),
  getResume: (id: string) => http.get<Resume>(`/job-search/resumes/${id}`),
  uploadResume(input: ResumeUploadInput) {
    const form = new FormData()
    form.append('file', input.file)
    if (input.name) form.append('name', input.name)
    if (input.targetRole) form.append('targetRole', input.targetRole)
    if (input.notes) form.append('notes', input.notes)
    return http.post<Resume>('/job-search/resumes/upload', form)
  },
  updateResume: (id: string, input: ResumeUpdateInput) =>
    http.patch<Resume>(`/job-search/resumes/${id}`, input),
  removeResume: (id: string) => http.delete<{ id: string }>(`/job-search/resumes/${id}`),

  listJobs: (query: JobPostListQuery = {}) =>
    http.get<JobPost[]>('/job-search/jobs', { query: cleanQuery(query) }),
  getJob: (id: string) => http.get<JobPost>(`/job-search/jobs/${id}`),
  parseJob: (input: JobPostParseInput) => http.post<JobPostParsed>('/job-search/jobs/parse', input),
  extractJobImage(file: File) {
    const form = new FormData()
    form.append('file', file)
    return http.post<JobPostImageExtracted>('/job-search/jobs/extract-jd-image', form)
  },
  createJob: (input: JobPostCreateInput) => http.post<JobPost>('/job-search/jobs', input),
  updateJob: (id: string, input: JobPostUpdateInput) =>
    http.patch<JobPost>(`/job-search/jobs/${id}`, input),
  removeJob: (id: string) => http.delete<{ id: string }>(`/job-search/jobs/${id}`),
  listGreetingDrafts: (jobPostId: string) =>
    http.get<GreetingDraft[]>(`/job-search/jobs/${jobPostId}/greetings`),
  generateGreeting: (input: GreetingGenerateInput) =>
    http.post<GreetingDraft>('/job-search/greetings/generate', input),
  listTailoredResumes: (jobPostId: string) =>
    http.get<TailoredResume[]>(`/job-search/jobs/${jobPostId}/tailored-resumes`),
  generateTailoredResume: (input: TailoredResumeGenerateInput) =>
    http.post<TailoredResume>('/job-search/tailored-resumes/generate', input),
  listRequirementAnalyses: () =>
    http.get<RequirementAnalysis[]>('/job-search/requirement-analyses'),
  getRequirementAnalysis: (id: string) =>
    http.get<RequirementAnalysis>(`/job-search/requirement-analyses/${id}`),
  generateRequirementAnalysis: (input: RequirementAnalysisGenerateInput) =>
    http.post<RequirementAnalysis>('/job-search/requirement-analyses/generate', input),

  listStatuses: () => http.get<ApplicationStatus[]>('/job-search/statuses'),
  createStatus: (input: ApplicationStatusCreateInput) =>
    http.post<ApplicationStatus>('/job-search/statuses', input),
  updateStatus: (id: string, input: ApplicationStatusUpdateInput) =>
    http.patch<ApplicationStatus>(`/job-search/statuses/${id}`, input),
  removeStatus: (id: string) => http.delete<{ id: string }>(`/job-search/statuses/${id}`),
}
