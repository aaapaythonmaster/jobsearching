import { db } from '@/db'
import type {
  ApplicationStatus,
  ApplicationStatusCreateRecord,
  ApplicationStatusRow,
  GreetingDraft,
  GreetingDraftCreateRecord,
  GreetingDraftRow,
  JobPost,
  JobPostCreateRecord,
  JobPostRow,
  RequirementAnalysis,
  RequirementAnalysisCreateRecord,
  RequirementAnalysisRow,
  Resume,
  ResumeCreateRecord,
  ResumeRow,
  TailoredResume,
  TailoredResumeCreateRecord,
  TailoredResumeRow,
} from './job-search.types'
import type {
  ApplicationStatusUpdateInput,
  JobPostListQuery,
  JobPostUpdateInput,
  ResumeListQuery,
  ResumeUpdateInput,
} from './job-search.schema'

/**
 * Repositories own SQL. Use `?` placeholders only — the pg adapter rewrites
 * them to `$N`. Rows are normalised back into API-facing camelCase objects.
 */

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

function toResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    name: row.name,
    targetRole: row.target_role,
    sourceFileName: row.source_file_name,
    sourceFileType: row.source_file_type === 'pdf' ? 'pdf' : 'docx',
    sourceFilePath: row.source_file_path,
    sourceFileSize: row.source_file_size,
    extractedText: row.extracted_text,
    contentText: row.content_text,
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toJobPost(row: JobPostRow): JobPost {
  return {
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    jobDirection: row.job_direction,
    city: row.city,
    salaryRange: row.salary_range,
    sourcePlatform: row.source_platform,
    jobUrl: row.job_url,
    jdText: row.jd_text,
    statusId: row.status_id,
    notes: row.notes,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toApplicationStatus(row: ApplicationStatusRow): ApplicationStatus {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isDefault: typeof row.is_default === 'number' ? row.is_default !== 0 : Boolean(row.is_default),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function toGreetingDraft(row: GreetingDraftRow): GreetingDraft {
  return {
    id: row.id,
    jobPostId: row.job_post_id,
    jobSnapshot: JSON.parse(row.job_snapshot) as JobPost,
    content: row.content,
    style: row.style,
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: toIso(row.created_at),
  }
}

function toTailoredResume(row: TailoredResumeRow): TailoredResume {
  return {
    id: row.id,
    resumeId: row.resume_id,
    jobPostId: row.job_post_id,
    resumeSnapshot: JSON.parse(row.resume_snapshot) as Resume,
    jobSnapshot: JSON.parse(row.job_snapshot) as JobPost,
    content: row.content,
    changeNotes: row.change_notes,
    riskNotes: row.risk_notes,
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: toIso(row.created_at),
  }
}

function toRequirementAnalysis(row: RequirementAnalysisRow): RequirementAnalysis {
  return {
    id: row.id,
    title: row.title,
    jobPostIds: JSON.parse(row.job_post_ids) as string[],
    groupedResult: JSON.parse(row.grouped_result) as RequirementAnalysis['groupedResult'],
    summary: row.summary,
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: toIso(row.created_at),
  }
}

export const jobSearchRepository = {
  async listResumes(query: ResumeListQuery = {}): Promise<Resume[]> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (query.keyword) {
      conditions.push('(name LIKE ? OR content_text LIKE ? OR extracted_text LIKE ?)')
      const keyword = `%${query.keyword}%`
      params.push(keyword, keyword, keyword)
    }
    if (query.targetRole) {
      conditions.push('target_role = ?')
      params.push(query.targetRole)
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
    const rows = await db.query<ResumeRow>(
      `SELECT * FROM job_search_resumes${where} ORDER BY updated_at DESC`,
      params,
    )
    return rows.map(toResume)
  },

  async findResumeById(id: string): Promise<Resume | null> {
    const row = await db.queryOne<ResumeRow>('SELECT * FROM job_search_resumes WHERE id = ?', [id])
    return row ? toResume(row) : null
  },

  async createResume(input: ResumeCreateRecord): Promise<Resume> {
    await db.execute(
      `INSERT INTO job_search_resumes (
        id,
        name,
        target_role,
        source_file_name,
        source_file_type,
        source_file_path,
        source_file_size,
        extracted_text,
        content_text,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.name,
        input.targetRole,
        input.sourceFileName,
        input.sourceFileType,
        input.sourceFilePath,
        input.sourceFileSize,
        input.extractedText,
        input.contentText,
        input.notes,
        input.createdAt,
        input.updatedAt,
      ],
    )
    return toResume({
      id: input.id,
      name: input.name,
      target_role: input.targetRole,
      source_file_name: input.sourceFileName,
      source_file_type: input.sourceFileType,
      source_file_path: input.sourceFilePath,
      source_file_size: input.sourceFileSize,
      extracted_text: input.extractedText,
      content_text: input.contentText,
      notes: input.notes,
      created_at: input.createdAt,
      updated_at: input.updatedAt,
    })
  },

  async updateResume(
    id: string,
    input: ResumeUpdateInput,
    updatedAt: string,
  ): Promise<Resume | null> {
    const sets: string[] = []
    const params: unknown[] = []

    if (input.name !== undefined) {
      sets.push('name = ?')
      params.push(input.name)
    }
    if (input.targetRole !== undefined) {
      sets.push('target_role = ?')
      params.push(input.targetRole)
    }
    if (input.contentText !== undefined) {
      sets.push('content_text = ?')
      params.push(input.contentText)
    }
    if (input.notes !== undefined) {
      sets.push('notes = ?')
      params.push(input.notes)
    }

    if (sets.length === 0) return this.findResumeById(id)

    sets.push('updated_at = ?')
    params.push(updatedAt, id)
    await db.execute(`UPDATE job_search_resumes SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.findResumeById(id)
  },

  async removeResume(id: string): Promise<boolean> {
    const result = await db.execute('DELETE FROM job_search_resumes WHERE id = ?', [id])
    return result.rowsAffected > 0
  },

  async listStatuses(): Promise<ApplicationStatus[]> {
    const rows = await db.query<ApplicationStatusRow>(
      'SELECT * FROM job_search_statuses ORDER BY sort_order ASC, created_at ASC',
    )
    return rows.map(toApplicationStatus)
  },

  async findStatusById(id: string): Promise<ApplicationStatus | null> {
    const row = await db.queryOne<ApplicationStatusRow>(
      'SELECT * FROM job_search_statuses WHERE id = ?',
      [id],
    )
    return row ? toApplicationStatus(row) : null
  },

  async createStatus(input: ApplicationStatusCreateRecord): Promise<ApplicationStatus> {
    await db.execute(
      `INSERT INTO job_search_statuses (
        id,
        name,
        color,
        sort_order,
        is_default,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.name,
        input.color,
        input.sortOrder,
        input.isDefault ? 1 : 0,
        input.createdAt,
        input.updatedAt,
      ],
    )
    return toApplicationStatus({
      id: input.id,
      name: input.name,
      color: input.color,
      sort_order: input.sortOrder,
      is_default: input.isDefault ? 1 : 0,
      created_at: input.createdAt,
      updated_at: input.updatedAt,
    })
  },

  async updateStatus(
    id: string,
    input: ApplicationStatusUpdateInput,
    updatedAt: string,
  ): Promise<ApplicationStatus | null> {
    const sets: string[] = []
    const params: unknown[] = []

    if (input.name !== undefined) {
      sets.push('name = ?')
      params.push(input.name)
    }
    if (input.color !== undefined) {
      sets.push('color = ?')
      params.push(input.color)
    }
    if (input.sortOrder !== undefined) {
      sets.push('sort_order = ?')
      params.push(input.sortOrder)
    }

    if (sets.length === 0) return this.findStatusById(id)

    sets.push('updated_at = ?')
    params.push(updatedAt, id)
    await db.execute(`UPDATE job_search_statuses SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.findStatusById(id)
  },

  async countJobPostsByStatus(id: string): Promise<number> {
    const row = await db.queryOne<{ count: number | string }>(
      'SELECT COUNT(*) AS count FROM job_search_job_posts WHERE status_id = ?',
      [id],
    )
    return Number(row?.count ?? 0)
  },

  async removeStatus(id: string): Promise<boolean> {
    const result = await db.execute('DELETE FROM job_search_statuses WHERE id = ?', [id])
    return result.rowsAffected > 0
  },

  async listJobPosts(query: JobPostListQuery = {}): Promise<JobPost[]> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (query.keyword) {
      conditions.push('(company_name LIKE ? OR job_title LIKE ? OR jd_text LIKE ?)')
      const keyword = `%${query.keyword}%`
      params.push(keyword, keyword, keyword)
    }
    if (query.statusId) {
      conditions.push('status_id = ?')
      params.push(query.statusId)
    }
    if (query.jobDirection) {
      conditions.push('job_direction = ?')
      params.push(query.jobDirection)
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
    const rows = await db.query<JobPostRow>(
      `SELECT * FROM job_search_job_posts${where} ORDER BY updated_at DESC`,
      params,
    )
    return rows.map(toJobPost)
  },

  async findJobPostById(id: string): Promise<JobPost | null> {
    const row = await db.queryOne<JobPostRow>(
      'SELECT * FROM job_search_job_posts WHERE id = ?',
      [id],
    )
    return row ? toJobPost(row) : null
  },

  async findJobPostsByIds(ids: string[]): Promise<JobPost[]> {
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(', ')
    const rows = await db.query<JobPostRow>(
      `SELECT * FROM job_search_job_posts WHERE id IN (${placeholders})`,
      ids,
    )
    const byId = new Map(rows.map((row) => [row.id, toJobPost(row)]))
    return ids.map((id) => byId.get(id)).filter((item): item is JobPost => Boolean(item))
  },

  async createJobPost(input: JobPostCreateRecord): Promise<JobPost> {
    await db.execute(
      `INSERT INTO job_search_job_posts (
        id,
        company_name,
        job_title,
        job_direction,
        city,
        salary_range,
        source_platform,
        job_url,
        jd_text,
        status_id,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.companyName,
        input.jobTitle,
        input.jobDirection,
        input.city,
        input.salaryRange,
        input.sourcePlatform,
        input.jobUrl,
        input.jdText,
        input.statusId,
        input.notes,
        input.createdAt,
        input.updatedAt,
      ],
    )
    return toJobPost({
      id: input.id,
      company_name: input.companyName,
      job_title: input.jobTitle,
      job_direction: input.jobDirection,
      city: input.city,
      salary_range: input.salaryRange,
      source_platform: input.sourcePlatform,
      job_url: input.jobUrl,
      jd_text: input.jdText,
      status_id: input.statusId,
      notes: input.notes,
      created_at: input.createdAt,
      updated_at: input.updatedAt,
    })
  },

  async updateJobPost(
    id: string,
    input: JobPostUpdateInput,
    updatedAt: string,
  ): Promise<JobPost | null> {
    const sets: string[] = []
    const params: unknown[] = []

    if (input.companyName !== undefined) {
      sets.push('company_name = ?')
      params.push(input.companyName)
    }
    if (input.jobTitle !== undefined) {
      sets.push('job_title = ?')
      params.push(input.jobTitle)
    }
    if (input.jobDirection !== undefined) {
      sets.push('job_direction = ?')
      params.push(input.jobDirection)
    }
    if (input.city !== undefined) {
      sets.push('city = ?')
      params.push(input.city)
    }
    if (input.salaryRange !== undefined) {
      sets.push('salary_range = ?')
      params.push(input.salaryRange)
    }
    if (input.sourcePlatform !== undefined) {
      sets.push('source_platform = ?')
      params.push(input.sourcePlatform)
    }
    if (input.jobUrl !== undefined) {
      sets.push('job_url = ?')
      params.push(input.jobUrl)
    }
    if (input.jdText !== undefined) {
      sets.push('jd_text = ?')
      params.push(input.jdText)
    }
    if (input.statusId !== undefined) {
      sets.push('status_id = ?')
      params.push(input.statusId)
    }
    if (input.notes !== undefined) {
      sets.push('notes = ?')
      params.push(input.notes)
    }

    if (sets.length === 0) return this.findJobPostById(id)

    sets.push('updated_at = ?')
    params.push(updatedAt, id)
    await db.execute(`UPDATE job_search_job_posts SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.findJobPostById(id)
  },

  async removeJobPost(id: string): Promise<boolean> {
    const result = await db.execute('DELETE FROM job_search_job_posts WHERE id = ?', [id])
    return result.rowsAffected > 0
  },

  async listGreetingDrafts(jobPostId: string): Promise<GreetingDraft[]> {
    const rows = await db.query<GreetingDraftRow>(
      'SELECT * FROM job_search_greeting_drafts WHERE job_post_id = ? ORDER BY created_at DESC',
      [jobPostId],
    )
    return rows.map(toGreetingDraft)
  },

  async createGreetingDraft(input: GreetingDraftCreateRecord): Promise<GreetingDraft> {
    const jobSnapshot = JSON.stringify(input.jobSnapshot)
    await db.execute(
      `INSERT INTO job_search_greeting_drafts (
        id,
        job_post_id,
        job_snapshot,
        content,
        style,
        model_name,
        prompt_version,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.jobPostId,
        jobSnapshot,
        input.content,
        input.style,
        input.modelName,
        input.promptVersion,
        input.createdAt,
      ],
    )
    return toGreetingDraft({
      id: input.id,
      job_post_id: input.jobPostId,
      job_snapshot: jobSnapshot,
      content: input.content,
      style: input.style,
      model_name: input.modelName,
      prompt_version: input.promptVersion,
      created_at: input.createdAt,
    })
  },

  async listTailoredResumesByJobPost(jobPostId: string): Promise<TailoredResume[]> {
    const rows = await db.query<TailoredResumeRow>(
      'SELECT * FROM job_search_tailored_resumes WHERE job_post_id = ? ORDER BY created_at DESC',
      [jobPostId],
    )
    return rows.map(toTailoredResume)
  },

  async createTailoredResume(input: TailoredResumeCreateRecord): Promise<TailoredResume> {
    const resumeSnapshot = JSON.stringify(input.resumeSnapshot)
    const jobSnapshot = JSON.stringify(input.jobSnapshot)
    await db.execute(
      `INSERT INTO job_search_tailored_resumes (
        id,
        resume_id,
        job_post_id,
        resume_snapshot,
        job_snapshot,
        content,
        change_notes,
        risk_notes,
        model_name,
        prompt_version,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.resumeId,
        input.jobPostId,
        resumeSnapshot,
        jobSnapshot,
        input.content,
        input.changeNotes,
        input.riskNotes,
        input.modelName,
        input.promptVersion,
        input.createdAt,
      ],
    )
    return toTailoredResume({
      id: input.id,
      resume_id: input.resumeId,
      job_post_id: input.jobPostId,
      resume_snapshot: resumeSnapshot,
      job_snapshot: jobSnapshot,
      content: input.content,
      change_notes: input.changeNotes,
      risk_notes: input.riskNotes,
      model_name: input.modelName,
      prompt_version: input.promptVersion,
      created_at: input.createdAt,
    })
  },

  async listRequirementAnalyses(): Promise<RequirementAnalysis[]> {
    const rows = await db.query<RequirementAnalysisRow>(
      'SELECT * FROM job_search_requirement_analyses ORDER BY created_at DESC',
    )
    return rows.map(toRequirementAnalysis)
  },

  async findRequirementAnalysisById(id: string): Promise<RequirementAnalysis | null> {
    const row = await db.queryOne<RequirementAnalysisRow>(
      'SELECT * FROM job_search_requirement_analyses WHERE id = ?',
      [id],
    )
    return row ? toRequirementAnalysis(row) : null
  },

  async createRequirementAnalysis(
    input: RequirementAnalysisCreateRecord,
  ): Promise<RequirementAnalysis> {
    const jobPostIds = JSON.stringify(input.jobPostIds)
    const groupedResult = JSON.stringify(input.groupedResult)
    await db.execute(
      `INSERT INTO job_search_requirement_analyses (
        id,
        title,
        job_post_ids,
        grouped_result,
        summary,
        model_name,
        prompt_version,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.title,
        jobPostIds,
        groupedResult,
        input.summary,
        input.modelName,
        input.promptVersion,
        input.createdAt,
      ],
    )
    return toRequirementAnalysis({
      id: input.id,
      title: input.title,
      job_post_ids: jobPostIds,
      grouped_result: groupedResult,
      summary: input.summary,
      model_name: input.modelName,
      prompt_version: input.promptVersion,
      created_at: input.createdAt,
    })
  },
}
