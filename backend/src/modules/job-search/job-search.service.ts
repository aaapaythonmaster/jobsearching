import fs from 'node:fs/promises'
import path from 'node:path'
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/http-error'
import { nanoid } from '@/utils/id'
import { detectResumeFileType, extractResumeText } from './job-search.document'
import { generateText } from './job-search.ai'
import { jobSearchRepository } from './job-search.repository'
import type {
  ApplicationStatus,
  GreetingDraft,
  JobPost,
  RequirementAnalysis,
  RequirementGroupedResult,
  Resume,
  TailoredResume,
} from './job-search.types'
import type {
  ApplicationStatusCreateInput,
  ApplicationStatusUpdateInput,
  GreetingGenerateInput,
  JobPostCreateInput,
  JobPostListQuery,
  JobPostParsedDto,
  JobPostParseInput,
  JobPostUpdateInput,
  ResumeListQuery,
  ResumeUpdateInput,
  ResumeUploadMetadata,
  RequirementAnalysisGenerateInput,
  TailoredResumeGenerateInput,
} from './job-search.schema'
import { env } from '@/config/env'

export interface ResumeUploadInput {
  fileName: string
  mimeType: string
  size: number
  buffer: Buffer
  metadata: ResumeUploadMetadata
}

/**
 * Business rules. Keep this layer free of HTTP/Fastify concerns. Throw
 * `AppError` subclasses for domain failures; the global handler translates
 * them into HTTP responses.
 */
export const jobSearchService = {
  listResumes(query: ResumeListQuery): Promise<Resume[]> {
    return jobSearchRepository.listResumes(query)
  },

  async getResume(id: string): Promise<Resume> {
    const resume = await jobSearchRepository.findResumeById(id)
    if (!resume) throw NotFoundError('resume')
    return resume
  },

  async uploadResume(input: ResumeUploadInput): Promise<Resume> {
    const id = nanoid()
    const fileType = detectResumeFileType(input.fileName, input.mimeType)
    const extractedText = await extractResumeText(input.buffer, fileType)
    const storedFileName = `${id}.${fileType}`
    const relativePath = path.join('data', 'job-search', 'resumes', storedFileName)
    const absolutePath = path.resolve(relativePath)
    const now = new Date().toISOString()

    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, input.buffer)

    return jobSearchRepository.createResume({
      id,
      name: input.metadata.name ?? stripExtension(input.fileName),
      targetRole: input.metadata.targetRole ?? null,
      sourceFileName: path.basename(input.fileName),
      sourceFileType: fileType,
      sourceFilePath: relativePath,
      sourceFileSize: input.size,
      extractedText,
      contentText: extractedText,
      notes: input.metadata.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  },

  async updateResume(id: string, input: ResumeUpdateInput): Promise<Resume> {
    const exists = await jobSearchRepository.findResumeById(id)
    if (!exists) throw NotFoundError('resume')

    const updated = await jobSearchRepository.updateResume(id, input, new Date().toISOString())
    if (!updated) throw NotFoundError('resume')
    return updated
  },

  async removeResume(id: string): Promise<{ id: string }> {
    const resume = await jobSearchRepository.findResumeById(id)
    if (!resume) throw NotFoundError('resume')

    const ok = await jobSearchRepository.removeResume(id)
    if (!ok) throw NotFoundError('resume')
    await removeStoredFile(resume.sourceFilePath)
    return { id }
  },

  listStatuses(): Promise<ApplicationStatus[]> {
    return jobSearchRepository.listStatuses()
  },

  createStatus(input: ApplicationStatusCreateInput): Promise<ApplicationStatus> {
    const now = new Date().toISOString()
    return jobSearchRepository.createStatus({
      id: nanoid(),
      name: input.name,
      color: input.color ?? null,
      sortOrder: input.sortOrder ?? 0,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    })
  },

  async updateStatus(id: string, input: ApplicationStatusUpdateInput): Promise<ApplicationStatus> {
    const exists = await jobSearchRepository.findStatusById(id)
    if (!exists) throw NotFoundError('status')

    const updated = await jobSearchRepository.updateStatus(id, input, new Date().toISOString())
    if (!updated) throw NotFoundError('status')
    return updated
  },

  async removeStatus(id: string): Promise<{ id: string }> {
    const exists = await jobSearchRepository.findStatusById(id)
    if (!exists) throw NotFoundError('status')

    const usageCount = await jobSearchRepository.countJobPostsByStatus(id)
    if (usageCount > 0) throw ConflictError('Status is used by job posts')

    const ok = await jobSearchRepository.removeStatus(id)
    if (!ok) throw NotFoundError('status')
    return { id }
  },

  listJobPosts(query: JobPostListQuery): Promise<JobPost[]> {
    return jobSearchRepository.listJobPosts(query)
  },

  async getJobPost(id: string): Promise<JobPost> {
    const jobPost = await jobSearchRepository.findJobPostById(id)
    if (!jobPost) throw NotFoundError('job post')
    return jobPost
  },

  async createJobPost(input: JobPostCreateInput): Promise<JobPost> {
    await ensureStatusExists(input.statusId ?? null)
    const now = new Date().toISOString()
    return jobSearchRepository.createJobPost({
      id: nanoid(),
      companyName: input.companyName,
      jobTitle: input.jobTitle,
      jobDirection: input.jobDirection,
      city: input.city ?? null,
      salaryRange: input.salaryRange ?? null,
      sourcePlatform: input.sourcePlatform ?? 'Boss直聘',
      jobUrl: input.jobUrl ?? null,
      jdText: input.jdText,
      statusId: input.statusId ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
  },

  async parseJobPost(input: JobPostParseInput): Promise<JobPostParsedDto> {
    const generated = await generateText({
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            '你是中文招聘 JD 信息抽取助手。你只从用户提供的 JD 原文中抽取字段，不要编造。输出必须是合法 JSON，不要 Markdown 代码块。',
        },
        {
          role: 'user',
          content: buildJobPostParsePrompt(input.jdText),
        },
      ],
    })
    return parseJobPostOutput(generated)
  },

  async updateJobPost(id: string, input: JobPostUpdateInput): Promise<JobPost> {
    const exists = await jobSearchRepository.findJobPostById(id)
    if (!exists) throw NotFoundError('job post')
    await ensureStatusExists(input.statusId ?? null)

    const updated = await jobSearchRepository.updateJobPost(id, input, new Date().toISOString())
    if (!updated) throw NotFoundError('job post')
    return updated
  },

  async removeJobPost(id: string): Promise<{ id: string }> {
    const ok = await jobSearchRepository.removeJobPost(id)
    if (!ok) throw NotFoundError('job post')
    return { id }
  },

  async listGreetingDrafts(jobPostId: string): Promise<GreetingDraft[]> {
    const jobPost = await jobSearchRepository.findJobPostById(jobPostId)
    if (!jobPost) throw NotFoundError('job post')
    return jobSearchRepository.listGreetingDrafts(jobPostId)
  },

  async generateGreeting(input: GreetingGenerateInput): Promise<GreetingDraft> {
    const jobPost = await jobSearchRepository.findJobPostById(input.jobPostId)
    if (!jobPost) throw NotFoundError('job post')

    const style = input.style ?? 'concise-natural'
    const content = await generateText({
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            '你是中文求职沟通助手，专门帮求职者写 Boss 直聘开场招呼。输出必须自然、简短、专业，不夸大经历，不编造事实，不要标题，不要解释。',
        },
        {
          role: 'user',
          content: buildGreetingPrompt(jobPost),
        },
      ],
    })

    return jobSearchRepository.createGreetingDraft({
      id: nanoid(),
      jobPostId: jobPost.id,
      jobSnapshot: jobPost,
      content,
      style,
      modelName: env.AI_MODEL,
      promptVersion: 'greeting-v1',
      createdAt: new Date().toISOString(),
    })
  },

  async listTailoredResumesByJobPost(jobPostId: string): Promise<TailoredResume[]> {
    const jobPost = await jobSearchRepository.findJobPostById(jobPostId)
    if (!jobPost) throw NotFoundError('job post')
    return jobSearchRepository.listTailoredResumesByJobPost(jobPostId)
  },

  async generateTailoredResume(input: TailoredResumeGenerateInput): Promise<TailoredResume> {
    const [resume, jobPost] = await Promise.all([
      jobSearchRepository.findResumeById(input.resumeId),
      jobSearchRepository.findJobPostById(input.jobPostId),
    ])
    if (!resume) throw NotFoundError('resume')
    if (!jobPost) throw NotFoundError('job post')

    const generated = await generateText({
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            '你是中文求职简历优化助手。你只能基于用户提供的原始简历和岗位 JD 调整表达与结构，严禁编造不存在的经历、公司、学历、年限、项目和数据。输出必须是合法 JSON。',
        },
        {
          role: 'user',
          content: buildTailoredResumePrompt(resume, jobPost),
        },
      ],
    })
    const parsed = parseTailoredResumeOutput(generated)

    return jobSearchRepository.createTailoredResume({
      id: nanoid(),
      resumeId: resume.id,
      jobPostId: jobPost.id,
      resumeSnapshot: resume,
      jobSnapshot: jobPost,
      content: parsed.content,
      changeNotes: parsed.changeNotes,
      riskNotes: parsed.riskNotes,
      modelName: env.AI_MODEL,
      promptVersion: 'tailored-resume-v1',
      createdAt: new Date().toISOString(),
    })
  },

  listRequirementAnalyses(): Promise<RequirementAnalysis[]> {
    return jobSearchRepository.listRequirementAnalyses()
  },

  async getRequirementAnalysis(id: string): Promise<RequirementAnalysis> {
    const analysis = await jobSearchRepository.findRequirementAnalysisById(id)
    if (!analysis) throw NotFoundError('requirement analysis')
    return analysis
  },

  async generateRequirementAnalysis(
    input: RequirementAnalysisGenerateInput,
  ): Promise<RequirementAnalysis> {
    const jobPostIds = [...new Set(input.jobPostIds)]
    if (jobPostIds.length < 2) throw BadRequestError('At least two distinct job posts are required')

    const jobPosts = await jobSearchRepository.findJobPostsByIds(jobPostIds)
    if (jobPosts.length !== jobPostIds.length) throw NotFoundError('job post')

    const generated = await generateText({
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '你是中文招聘 JD 分析助手。你会按岗位方向分组，总结多个 JD 的共性要求。输出必须是合法 JSON，不要编造 JD 中没有的要求。',
        },
        {
          role: 'user',
          content: buildRequirementAnalysisPrompt(jobPosts),
        },
      ],
    })
    const parsed = parseRequirementAnalysisOutput(generated, groupJobPostsByDirection(jobPosts))
    const title = input.title ?? buildRequirementAnalysisTitle(jobPosts)

    return jobSearchRepository.createRequirementAnalysis({
      id: nanoid(),
      title,
      jobPostIds,
      groupedResult: parsed.groupedResult,
      summary: parsed.summary,
      modelName: env.AI_MODEL,
      promptVersion: 'requirement-analysis-v1',
      createdAt: new Date().toISOString(),
    })
  },
}

function stripExtension(filename: string): string {
  return path.basename(filename).replace(/\.[^.]+$/, '') || 'Untitled resume'
}

async function removeStoredFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(path.resolve(filePath))
  } catch (error) {
    const maybeNodeError = error as { code?: string }
    if (maybeNodeError.code !== 'ENOENT') throw error
  }
}

async function ensureStatusExists(statusId: string | null | undefined): Promise<void> {
  if (!statusId) return
  const status = await jobSearchRepository.findStatusById(statusId)
  if (!status) throw NotFoundError('status')
}

function buildGreetingPrompt(jobPost: JobPost): string {
  return [
    '请根据下面的 Boss 直聘岗位 JD，生成一段可直接发给招聘者的中文打招呼内容。',
    '要求：',
    '1. 80 到 140 字左右。',
    '2. 语气简短自然、专业匹配、不油腻。',
    '3. 提到与岗位相关的匹配点，但不要编造具体年限、公司、项目经历。',
    '4. 结尾表达希望进一步沟通。',
    '',
    `公司：${jobPost.companyName}`,
    `岗位：${jobPost.jobTitle}`,
    `方向：${jobPost.jobDirection}`,
    `城市：${jobPost.city ?? '未填写'}`,
    `薪资：${jobPost.salaryRange ?? '未填写'}`,
    `JD：${jobPost.jdText}`,
  ].join('\n')
}

function buildJobPostParsePrompt(jdText: string): string {
  return [
    '请从下面的招聘 JD 原文中抽取岗位信息。',
    '输出必须是合法 JSON，不要 Markdown 代码块，不要额外解释。',
    'JSON 字段：',
    '{',
    '  "companyName": "公司名称或 null",',
    '  "jobTitle": "岗位名称或 null",',
    '  "jobDirection": "岗位方向，例如 前端开发/产品经理/后端开发/AI产品，无法判断则 null",',
    '  "city": "城市或 null",',
    '  "salaryRange": "薪资范围，例如 20-30K 或 null",',
    '  "sourcePlatform": "招聘平台，例如 Boss直聘 或 null",',
    '  "jobUrl": "岗位链接或 null",',
    '  "notes": "从 JD 中值得记录的补充信息，无法判断则 null"',
    '}',
    '',
    '要求：',
    '1. 只能基于原文抽取，不要猜测公司或岗位。',
    '2. 岗位方向要短，适合用于分组。',
    '3. 如果原文没有明确字段，返回 null。',
    '4. 输出完全中文字段值。',
    '',
    'JD 原文：',
    jdText,
  ].join('\n')
}

function parseJobPostOutput(raw: string): JobPostParsedDto {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    return {
      companyName: normalizeOptionalField(parsed.companyName),
      jobTitle: normalizeOptionalField(parsed.jobTitle),
      jobDirection: normalizeOptionalField(parsed.jobDirection),
      city: normalizeOptionalField(parsed.city),
      salaryRange: normalizeOptionalField(parsed.salaryRange),
      sourcePlatform: normalizeOptionalField(parsed.sourcePlatform),
      jobUrl: normalizeOptionalUrl(parsed.jobUrl),
      notes: normalizeOptionalField(parsed.notes),
    }
  } catch {
    return emptyParsedJobPost()
  }
}

function emptyParsedJobPost(): JobPostParsedDto {
  return {
    companyName: null,
    jobTitle: null,
    jobDirection: null,
    city: null,
    salaryRange: null,
    sourcePlatform: null,
    jobUrl: null,
    notes: null,
  }
}

function normalizeOptionalField(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') return null
  return trimmed
}

function normalizeOptionalUrl(value: unknown): string | null {
  const text = normalizeOptionalField(value)
  if (!text) return null
  try {
    return new URL(text).toString()
  } catch {
    return null
  }
}

function buildTailoredResumePrompt(resume: Resume, jobPost: JobPost): string {
  return [
    '请根据岗位 JD，对原始中文简历做一版“投递该岗位用”的调整版简历。',
    '输出必须是合法 JSON，不要 Markdown 代码块，不要额外解释。',
    'JSON 字段：',
    '{',
    '  "content": "调整后的完整中文简历正文，可直接复制使用",',
    '  "changeNotes": "本次主要调整点，使用中文条目说明",',
    '  "riskNotes": "哪些内容不能确定或不建议夸大，使用中文条目说明"',
    '}',
    '',
    '硬性要求：',
    '1. 只能基于原始简历已有事实进行重组、改写、突出重点。',
    '2. 可以调整标题、摘要、技能、项目描述顺序，使其更匹配 JD。',
    '3. 不得编造公司、学校、项目、年限、绩效数字、证书、技术经验。',
    '4. 对 JD 明确要求但原简历没有证据的能力，写进 riskNotes，不要写进 content。',
    '5. content 保持中文简历格式，结构清晰，适合页面内复制。',
    '',
    `基础简历名称：${resume.name}`,
    `基础简历目标方向：${resume.targetRole ?? '未填写'}`,
    `基础简历备注：${resume.notes ?? '无'}`,
    '基础简历正文：',
    resume.contentText,
    '',
    `目标公司：${jobPost.companyName}`,
    `目标岗位：${jobPost.jobTitle}`,
    `岗位方向：${jobPost.jobDirection}`,
    `城市：${jobPost.city ?? '未填写'}`,
    `薪资：${jobPost.salaryRange ?? '未填写'}`,
    '岗位 JD：',
    jobPost.jdText,
  ].join('\n')
}

interface TailoredResumeAiOutput {
  content: string
  changeNotes: string
  riskNotes: string
}

function parseTailoredResumeOutput(raw: string): TailoredResumeAiOutput {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as Partial<TailoredResumeAiOutput>
    return {
      content: normalizeAiText(parsed.content) || raw,
      changeNotes: normalizeAiText(parsed.changeNotes) || '未返回明确调整说明',
      riskNotes: normalizeAiText(parsed.riskNotes) || '未返回明确风险提醒',
    }
  } catch {
    return {
      content: raw,
      changeNotes: 'AI 未返回结构化调整说明',
      riskNotes: 'AI 未返回结构化风险提醒，请人工复核生成内容是否有事实扩写',
    }
  }
}

function normalizeAiText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join('\n')
  }
  return typeof value === 'string' ? value.trim() : ''
}

function buildRequirementAnalysisPrompt(jobPosts: JobPost[]): string {
  const groups = groupJobPostsByDirection(jobPosts)
  const lines = [
    '请分析下面这些招聘 JD，按岗位方向分组，提取共性要求。',
    '输出必须是合法 JSON，不要 Markdown 代码块，不要额外解释。',
    'JSON 字段：',
    '{',
    '  "summary": "整体共性总结，中文 3-6 句话",',
    '  "groups": [',
    '    {',
    '      "jobDirection": "岗位方向",',
    '      "jobPostCount": 2,',
    '      "commonSkills": ["共同硬技能"],',
    '      "commonExperience": ["共同经验要求"],',
    '      "commonTools": ["共同工具/框架/平台"],',
    '      "softRequirements": ["共同软性要求"],',
    '      "niceToHave": ["加分项"],',
    '      "riskNotes": ["样本不足或 JD 未明确之处"]',
    '    }',
    '  ]',
    '}',
    '',
    '硬性要求：',
    '1. 必须按 jobDirection 分组输出，每个方向一个 group。',
    '2. 只总结 JD 中反复出现或明确出现的要求，不要臆测。',
    '3. 如果某组样本只有 1 条，要在 riskNotes 中说明样本不足。',
    '4. 输出内容完全中文。',
    '',
  ]

  for (const [direction, items] of groups.entries()) {
    lines.push(`岗位方向：${direction}`)
    for (const item of items) {
      lines.push(
        [
          `- ID：${item.id}`,
          `公司：${item.companyName}`,
          `岗位：${item.jobTitle}`,
          `城市：${item.city ?? '未填写'}`,
          `薪资：${item.salaryRange ?? '未填写'}`,
          `JD：${item.jdText}`,
        ].join('\n'),
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

function buildRequirementAnalysisTitle(jobPosts: JobPost[]): string {
  const directions = [...new Set(jobPosts.map((item) => item.jobDirection))]
  return `${directions.join('、')} JD 共性要求分析`
}

function groupJobPostsByDirection(jobPosts: JobPost[]): Map<string, JobPost[]> {
  const groups = new Map<string, JobPost[]>()
  for (const jobPost of jobPosts) {
    const direction = jobPost.jobDirection || '未分组'
    groups.set(direction, [...(groups.get(direction) ?? []), jobPost])
  }
  return groups
}

interface RequirementAnalysisAiOutput {
  summary: string
  groups: unknown[]
}

function parseRequirementAnalysisOutput(
  raw: string,
  expectedGroups: Map<string, JobPost[]>,
): { summary: string; groupedResult: RequirementGroupedResult } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as Partial<RequirementAnalysisAiOutput>
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups.map((group) => normalizeRequirementGroup(group, expectedGroups))
      : []
    return {
      summary: normalizeAiText(parsed.summary) || '未返回明确整体总结',
      groupedResult: {
        groups: ensureRequirementGroups(groups, expectedGroups),
      },
    }
  } catch {
    return {
      summary: 'AI 未返回结构化分析结果，请人工复核原始输出。',
      groupedResult: {
        groups: [...expectedGroups.entries()].map(([jobDirection, items]) => ({
          jobDirection,
          jobPostCount: items.length,
          commonSkills: [],
          commonExperience: [],
          commonTools: [],
          softRequirements: [],
          niceToHave: [],
          riskNotes: ['AI 未返回结构化分析结果'],
        })),
      },
    }
  }
}

function normalizeRequirementGroup(
  value: unknown,
  expectedGroups: Map<string, JobPost[]>,
): RequirementGroupedResult['groups'][number] {
  const group = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const jobDirection = normalizeAiText(group.jobDirection) || '未分组'
  return {
    jobDirection,
    jobPostCount: Number(group.jobPostCount ?? expectedGroups.get(jobDirection)?.length ?? 0),
    commonSkills: normalizeAiList(group.commonSkills),
    commonExperience: normalizeAiList(group.commonExperience),
    commonTools: normalizeAiList(group.commonTools),
    softRequirements: normalizeAiList(group.softRequirements),
    niceToHave: normalizeAiList(group.niceToHave),
    riskNotes: normalizeAiList(group.riskNotes),
  }
}

function ensureRequirementGroups(
  groups: RequirementGroupedResult['groups'],
  expectedGroups: Map<string, JobPost[]>,
): RequirementGroupedResult['groups'] {
  const byDirection = new Map(groups.map((group) => [group.jobDirection, group]))
  for (const [jobDirection, items] of expectedGroups.entries()) {
    if (!byDirection.has(jobDirection)) {
      groups.push({
        jobDirection,
        jobPostCount: items.length,
        commonSkills: [],
        commonExperience: [],
        commonTools: [],
        softRequirements: [],
        niceToHave: [],
        riskNotes: ['AI 未返回该岗位方向的结构化分析'],
      })
    }
  }
  return groups.map((group) => ({
    ...group,
    jobPostCount: expectedGroups.get(group.jobDirection)?.length ?? group.jobPostCount,
  }))
}

function normalizeAiList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  return []
}
