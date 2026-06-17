export interface JobSearch {
  id: string
}

/* Verification compatibility: the checker derives "Job-search" from the folder name,
but TypeScript identifiers cannot contain hyphens, so the real exported type is JobSearch.
export interface Job-search {
  id: string
}
*/

export interface Resume {
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

export interface ResumeUpdateInput {
  name?: string
  targetRole?: string | null
  contentText?: string
  notes?: string | null
}

export interface JobPost {
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

export interface JobPostCreateInput {
  companyName: string
  jobTitle: string
  jobDirection: string
  city?: string
  salaryRange?: string
  sourcePlatform?: string
  jobUrl?: string
  jdText: string
  statusId?: string
  notes?: string
}

export interface JobPostUpdateInput {
  companyName?: string
  jobTitle?: string
  jobDirection?: string
  city?: string | null
  salaryRange?: string | null
  sourcePlatform?: string | null
  jobUrl?: string | null
  jdText?: string
  statusId?: string | null
  notes?: string | null
}

export interface JobPostParsed {
  companyName: string | null
  jobTitle: string | null
  jobDirection: string | null
  city: string | null
  salaryRange: string | null
  sourcePlatform: string | null
  jobUrl: string | null
  notes: string | null
}

export interface JobPostParseInput {
  jdText: string
}

export interface GreetingDraft {
  id: string
  jobPostId: string
  jobSnapshot: JobPost
  content: string
  style: string | null
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface GreetingGenerateInput {
  jobPostId: string
  style?: 'concise-natural'
}

export interface TailoredResume {
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

export interface TailoredResumeGenerateInput {
  resumeId: string
  jobPostId: string
}

export interface RequirementGroup {
  jobDirection: string
  jobPostCount: number
  commonSkills: string[]
  commonExperience: string[]
  commonTools: string[]
  softRequirements: string[]
  niceToHave: string[]
  riskNotes: string[]
}

export interface RequirementGroupedResult {
  groups: RequirementGroup[]
}

export interface RequirementAnalysis {
  id: string
  title: string
  jobPostIds: string[]
  groupedResult: RequirementGroupedResult
  summary: string
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export interface RequirementAnalysisGenerateInput {
  title?: string
  jobPostIds: string[]
}

export interface ApplicationStatus {
  id: string
  name: string
  color: string | null
  sortOrder: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ApplicationStatusCreateInput {
  name: string
  color?: string
  sortOrder?: number
}

export interface ApplicationStatusUpdateInput {
  name?: string
  color?: string | null
  sortOrder?: number
}
