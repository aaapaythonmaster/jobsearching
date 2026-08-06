import fs from 'node:fs/promises'
import path from 'node:path'
import { BadRequestError, ConflictError, NotFoundError } from '@/utils/http-error'
import { nanoid } from '@/utils/id'
import { detectResumeFileType, extractResumeText } from './job-search.document'
import { extractTextFromImage, generateText } from './job-search.ai'
import { extractTextWithMacVision } from './job-search.ocr'
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
  JobPostImageExtractedDto,
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

export interface JobPostImageExtractInput {
  fileName: string
  mimeType: string
  size: number
  buffer: Buffer
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

  async extractJobPostImage(input: JobPostImageExtractInput): Promise<JobPostImageExtractedDto> {
    if (!input.mimeType.startsWith('image/')) throw BadRequestError('JD screenshot must be an image')
    if (input.size > 8 * 1024 * 1024) throw BadRequestError('JD screenshot must be smaller than 8MB')

    const base64Image = input.buffer.toString('base64')
    const jdText =
      (await extractTextWithMacVision(input.buffer, input.mimeType)) ||
      (await extractTextFromImage(base64Image, input.mimeType))

    return { jdText }
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
    const [jobPost, resume] = await Promise.all([
      jobSearchRepository.findJobPostById(input.jobPostId),
      jobSearchRepository.findResumeById(input.resumeId),
    ])
    if (!jobPost) throw NotFoundError('job post')
    if (!resume) throw NotFoundError('resume')

    const style = input.style ?? 'concise-natural'
    const content = await generateText({
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: [
            '你是中文求职沟通助手，专门帮助求职者生成 BOSS 直聘打招呼内容。',
            '你只能基于用户提供的岗位 JD 和基础简历内容输出。',
            '仅允许参考简历中的「实习经历」「AI项目集/作品集」「技能」板块，其他板块禁止参考。',
            '禁止编造无关经历，禁止编造数据，禁止把 JD 要求说成用户已有经历。',
            '如果原简历没有结果型表达，不得新增结果或量化成果；如果原简历已有结果型表达，可以引用。',
            '术语保留英文，例如 AI Agent、RAG、Prompt、Dify、Python。',
            '输出将直接展示在网页中供用户复制粘贴，必须是纯文本。',
            '禁止输出 JSON、Markdown 代码块、标题、解释性文字、分析过程或任何格式之外内容。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: buildGreetingPrompt(jobPost, resume),
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
      promptVersion: 'greeting-v2',
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
          content: [
            '你是中文求职简历调整助手。',
            '你只能基于用户提供的原始简历和岗位 JD，对已有内容进行顺序调整、表达改写和关键词强化。',
            '禁止编造不存在的经历、公司、学历、年限、项目、工具、结果或数据。',
            '允许将真实实践内容改写为更贴合 JD 要求的说法，但事实含义不能改变。',
            '允许调整 bullet 顺序；不允许删除弱相关 bullet；不允许合并来自不同公司、不同时间或不同项目的相似内容。',
            '术语保留英文，例如 AI Agent、RAG、Prompt、Dify、Python。',
            '输出将直接展示在网页中供用户复制粘贴，必须是纯文本。',
            '禁止输出 JSON、Markdown 代码块、标题、解释性文字、分析过程或任何格式之外内容。',
          ].join('\n'),
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
      promptVersion: 'tailored-resume-v2',
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

function buildGreetingPrompt(jobPost: JobPost, resume: Resume): string {
  return [
    '请根据下面的 Boss 直聘岗位 JD 和基础简历，生成一段可直接复制发送的中文打招呼内容。',
    '',
    '内容规范：',
    '1. 输出 2-4 点，允许少于 4 点；如果只输出 2-3 点，不要保留空编号。',
    '2. 每点约 50 字；如果与 JD 极为匹配，可以写到约 70 字。',
    '3. 最符合 JD 的匹配点放最前面。',
    '4. 可以写可迁移工作能力，但必须放在更匹配的内容之后，并明确体现为可迁移能力。',
    '5. 可以出现项目名、公司名，但一切必须来自简历原文。',
    '6. 只能聚焦简历中的「实习经历」「AI项目集/作品集」「技能」板块。',
    '7. 禁止参考简历其他部分，禁止编造无关经历，禁止编造数据。',
    '8. 结合 JD 要求与简历内容，生成“JD 匹配点 + 工作内容/成果”。',
    '9. 如果原简历中没有结果型表达，不得新增结果或量化成果；如果原简历已有结果型表达，可以引用。',
    '10. 技术术语保留英文。',
    '',
    '输出格式必须严格如下，不要添加任何其他文字；第 4 点仅在确有匹配内容时输出：',
    '您好，我与贵岗的匹配点如下：',
    '1.',
    '2.',
    '3.',
    '4.',
    '',
    `公司：${jobPost.companyName}`,
    `岗位：${jobPost.jobTitle}`,
    `方向：${jobPost.jobDirection}`,
    `城市：${jobPost.city ?? '未填写'}`,
    `薪资：${jobPost.salaryRange ?? '未填写'}`,
    `JD：${jobPost.jdText}`,
    '',
    `基础简历名称：${resume.name}`,
    `基础简历目标方向：${resume.targetRole ?? '未填写'}`,
    '基础简历正文：',
    resume.contentText,
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
    '请根据岗位 JD，对原始中文简历生成“简历修改调整建议”。',
    '注意：不是输出完整新简历，而是逐条列出需要调整的原文与完整调整后内容。',
    '',
    '硬性要求：',
    '1. 对需要修改的简历内容，先指出原文内容，再给出完整的调整后内容。',
    '2. 逐条列出。',
    '3. 禁止多余解释，仅呈现“对应 JD 要求 + 原文 + 调整后”。',
    '4. “对应 JD 要求”必须概括成短标签，不要引用整段 JD。',
    '5. 如果同一条原文匹配多个 JD 要求，只输出一次，并把短标签并列列出。',
    '6. 根据不同岗位，将真实实践内容包装为对应 JD 要求的点；工作内容确实不假，只是换说法。',
    '7. 可以调整 bullet 顺序。',
    '8. 不允许删除弱相关 bullet。',
    '9. 不允许合并来自不同公司、不同时间或不同项目的相似内容。',
    '10. 不得编造公司、学校、项目、年限、绩效数字、证书、技术经验。',
    '11. 如果原简历没有结果型表达，不得新增结果或量化成果；如果原简历已有结果型表达，可以引用。',
    '12. 技术术语保留英文。',
    '13. 严格禁止任何解释性文字、总结、建议、风险提醒。',
    '',
    '输出格式必须严格如下，不要添加任何其他文字：',
    '1.',
    '对应 JD 要求：短标签A、短标签B',
    '原文：',
    '调整后：',
    '',
    '2.',
    '对应 JD 要求：短标签A',
    '原文：',
    '调整后：',
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
    .replace(/^```(?:json|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (!cleaned) {
    return {
      content: raw.trim(),
      changeNotes: '纯文本简历调整建议',
      riskNotes: '请人工复核生成内容是否严格基于原文',
    }
  }

  return {
    content: cleaned,
    changeNotes: '纯文本简历调整建议',
    riskNotes: '请人工复核生成内容是否严格基于原文',
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
