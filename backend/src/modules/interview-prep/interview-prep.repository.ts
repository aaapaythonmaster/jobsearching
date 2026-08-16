import { db } from '@/db'
import { nanoid } from '@/utils/id'
import type {
  AnswerVersion,
  AnswerVersionRow,
  FaqCreateRecord,
  FaqSourceRow,
  InterviewFaq,
  InterviewFaqRow,
  InterviewProjectOverviewRow,
  InterviewQuestion,
  InterviewQuestionRow,
  IntroVersion,
  IntroVersionRow,
  JobPostLite,
  ResumeBinding,
  ResumeBindingRow,
  ResumeLite,
} from './interview-prep.types'
import type {
  FaqItem,
  InterviewProjectOverviewDto,
  InterviewQuestionCreateInput,
  InterviewQuestionUpdateInput,
} from './interview-prep.schema'

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

function toBinding(row: ResumeBindingRow): ResumeBinding {
  return {
    jobPostId: row.job_post_id,
    resumeId: row.resume_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function toQuestion(row: InterviewQuestionRow): InterviewQuestion {
  return {
    id: row.id,
    jobPostId: row.job_post_id,
    roundLabel: row.round_label as InterviewQuestion['roundLabel'],
    customRound: row.custom_round,
    questionText: row.question_text,
    userAnswer: row.user_answer,
    notes: row.notes,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function toAnswer(row: AnswerVersionRow): AnswerVersion {
  return {
    id: row.id,
    questionId: row.question_id,
    jobPostId: row.job_post_id,
    userAnswerSnapshot: row.user_answer_snapshot,
    analysis: row.analysis,
    referenceAnswer: row.reference_answer,
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: iso(row.created_at),
  }
}

function toIntro(row: IntroVersionRow): IntroVersion {
  return {
    id: row.id,
    jobPostId: row.job_post_id,
    resumeId: row.resume_id,
    durationLabel: row.duration_label as IntroVersion['durationLabel'],
    customDurationMinutes: row.custom_duration_minutes,
    content: row.content,
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: iso(row.created_at),
  }
}

function toFaq(row: InterviewFaqRow, sourceQuestionIds: string[] = []): InterviewFaq {
  const parsed = JSON.parse(row.items) as FaqItem[]
  return {
    id: row.id,
    jobPostId: row.job_post_id,
    resumeId: row.resume_id,
    type: row.type as InterviewFaq['type'],
    title: row.title,
    items: parsed.map((item) => ({
      ...item,
      sourceQuestionIds: item.sourceQuestionIds?.length
        ? item.sourceQuestionIds
        : sourceQuestionIds,
    })),
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: iso(row.created_at),
  }
}

export const interviewPrepRepository = {
  async listProjectOverviews(): Promise<InterviewProjectOverviewDto[]> {
    const rows = await db.query<InterviewProjectOverviewRow>(
      `SELECT
         jobs.id AS job_post_id,
         jobs.company_name,
         jobs.job_title,
         COUNT(questions.id) AS question_count,
         MAX(questions.created_at) AS latest_question_at
       FROM job_search_job_posts jobs
       LEFT JOIN interview_prep_questions questions ON questions.job_post_id = jobs.id
       GROUP BY jobs.id, jobs.company_name, jobs.job_title, jobs.created_at
       ORDER BY
         CASE WHEN MAX(questions.created_at) IS NULL THEN 1 ELSE 0 END,
         MAX(questions.created_at) DESC,
         jobs.created_at DESC`,
    )
    return rows.map((row) => ({
      jobPostId: row.job_post_id,
      companyName: row.company_name,
      jobTitle: row.job_title,
      questionCount: Number(row.question_count),
      latestQuestionAt: row.latest_question_at === null ? null : iso(row.latest_question_at),
    }))
  },

  async findJobPostById(id: string): Promise<JobPostLite | null> {
    const row = await db.queryOne<{
      id: string
      company_name: string
      job_title: string
      job_direction: string
      city: string | null
      salary_range: string | null
      jd_text: string
      notes: string | null
    }>(
      `SELECT id, company_name, job_title, job_direction, city, salary_range, jd_text, notes
       FROM job_search_job_posts WHERE id = ?`,
      [id],
    )
    return row
      ? {
          id: row.id,
          companyName: row.company_name,
          jobTitle: row.job_title,
          jobDirection: row.job_direction,
          city: row.city,
          salaryRange: row.salary_range,
          jdText: row.jd_text,
          notes: row.notes,
        }
      : null
  },

  async findResumeById(id: string): Promise<ResumeLite | null> {
    const row = await db.queryOne<{
      id: string
      name: string
      target_role: string | null
      content_text: string
    }>('SELECT id, name, target_role, content_text FROM job_search_resumes WHERE id = ?', [id])
    return row
      ? { id: row.id, name: row.name, targetRole: row.target_role, contentText: row.content_text }
      : null
  },

  async listResumeOptions(): Promise<Array<Pick<ResumeLite, 'id' | 'name' | 'targetRole'>>> {
    const rows = await db.query<{
      id: string
      name: string
      target_role: string | null
    }>('SELECT id, name, target_role FROM job_search_resumes ORDER BY updated_at DESC')
    return rows.map((row) => ({ id: row.id, name: row.name, targetRole: row.target_role }))
  },

  async findBinding(jobPostId: string): Promise<ResumeBinding | null> {
    const row = await db.queryOne<ResumeBindingRow>(
      'SELECT * FROM interview_prep_project_resumes WHERE job_post_id = ?',
      [jobPostId],
    )
    return row ? toBinding(row) : null
  },

  async upsertBinding(jobPostId: string, resumeId: string, now: string): Promise<ResumeBinding> {
    const exists = await this.findBinding(jobPostId)
    if (exists) {
      await db.execute(
        'UPDATE interview_prep_project_resumes SET resume_id = ?, updated_at = ? WHERE job_post_id = ?',
        [resumeId, now, jobPostId],
      )
    } else {
      await db.execute(
        `INSERT INTO interview_prep_project_resumes
         (id, job_post_id, resume_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [nanoid(), jobPostId, resumeId, now, now],
      )
    }
    return { jobPostId, resumeId, createdAt: exists?.createdAt ?? now, updatedAt: now }
  },

  async listQuestions(jobPostId: string): Promise<InterviewQuestion[]> {
    const rows = await db.query<InterviewQuestionRow>(
      'SELECT * FROM interview_prep_questions WHERE job_post_id = ? ORDER BY created_at DESC',
      [jobPostId],
    )
    return rows.map(toQuestion)
  },

  async findQuestionById(id: string): Promise<InterviewQuestion | null> {
    const row = await db.queryOne<InterviewQuestionRow>(
      'SELECT * FROM interview_prep_questions WHERE id = ?',
      [id],
    )
    return row ? toQuestion(row) : null
  },

  async findQuestionsByIds(ids: string[]): Promise<InterviewQuestion[]> {
    if (ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(', ')
    const rows = await db.query<InterviewQuestionRow>(
      `SELECT * FROM interview_prep_questions WHERE id IN (${placeholders})`,
      ids,
    )
    return rows.map(toQuestion)
  },

  async createQuestion(
    id: string,
    jobPostId: string,
    input: InterviewQuestionCreateInput,
    now: string,
  ): Promise<InterviewQuestion> {
    await db.execute(
      `INSERT INTO interview_prep_questions
       (id, job_post_id, round_label, custom_round, question_text, user_answer, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        jobPostId,
        input.roundLabel,
        input.customRound ?? null,
        input.questionText,
        input.userAnswer ?? null,
        input.notes ?? null,
        now,
        now,
      ],
    )
    return (await this.findQuestionById(id))!
  },

  async updateQuestion(
    id: string,
    input: InterviewQuestionUpdateInput,
    now: string,
  ): Promise<InterviewQuestion | null> {
    const sets: string[] = ['updated_at = ?']
    const params: unknown[] = [now]
    if (input.roundLabel !== undefined) {
      sets.push('round_label = ?')
      params.push(input.roundLabel)
    }
    if (input.customRound !== undefined) {
      sets.push('custom_round = ?')
      params.push(input.customRound)
    }
    if (input.questionText !== undefined) {
      sets.push('question_text = ?')
      params.push(input.questionText)
    }
    if (input.userAnswer !== undefined) {
      sets.push('user_answer = ?')
      params.push(input.userAnswer)
    }
    if (input.notes !== undefined) {
      sets.push('notes = ?')
      params.push(input.notes)
    }
    params.push(id)
    await db.execute(`UPDATE interview_prep_questions SET ${sets.join(', ')} WHERE id = ?`, params)
    return this.findQuestionById(id)
  },

  async removeQuestion(id: string): Promise<boolean> {
    const result = await db.execute('DELETE FROM interview_prep_questions WHERE id = ?', [id])
    return result.rowsAffected > 0
  },

  async listAnswerVersions(questionId: string): Promise<AnswerVersion[]> {
    const rows = await db.query<AnswerVersionRow>(
      'SELECT * FROM interview_prep_answer_versions WHERE question_id = ? ORDER BY created_at DESC',
      [questionId],
    )
    return rows.map(toAnswer)
  },

  async createAnswerVersion(input: AnswerVersion): Promise<AnswerVersion> {
    await db.execute(
      `INSERT INTO interview_prep_answer_versions
       (id, question_id, job_post_id, user_answer_snapshot, analysis, reference_answer, model_name, prompt_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.questionId,
        input.jobPostId,
        input.userAnswerSnapshot,
        input.analysis,
        input.referenceAnswer,
        input.modelName,
        input.promptVersion,
        input.createdAt,
      ],
    )
    return input
  },

  async listIntroVersions(jobPostId: string): Promise<IntroVersion[]> {
    const rows = await db.query<IntroVersionRow>(
      'SELECT * FROM interview_prep_intro_versions WHERE job_post_id = ? ORDER BY created_at DESC',
      [jobPostId],
    )
    return rows.map(toIntro)
  },

  async createIntroVersion(input: IntroVersion): Promise<IntroVersion> {
    await db.execute(
      `INSERT INTO interview_prep_intro_versions
       (id, job_post_id, resume_id, duration_label, custom_duration_minutes, content, model_name, prompt_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.jobPostId,
        input.resumeId,
        input.durationLabel,
        input.customDurationMinutes,
        input.content,
        input.modelName,
        input.promptVersion,
        input.createdAt,
      ],
    )
    return input
  },

  async listFaqs(jobPostId: string): Promise<InterviewFaq[]> {
    const rows = await db.query<InterviewFaqRow>(
      'SELECT * FROM interview_prep_faqs WHERE job_post_id = ? ORDER BY created_at DESC',
      [jobPostId],
    )
    const sources = await this.listFaqSources(rows.map((row) => row.id))
    return rows.map((row) => toFaq(row, sources.get(row.id) ?? []))
  },

  async findFaqById(id: string): Promise<InterviewFaq | null> {
    const row = await db.queryOne<InterviewFaqRow>(
      'SELECT * FROM interview_prep_faqs WHERE id = ?',
      [id],
    )
    if (!row) return null
    const sources = await this.listFaqSources([id])
    return toFaq(row, sources.get(id) ?? [])
  },

  async createFaq(input: FaqCreateRecord): Promise<InterviewFaq> {
    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO interview_prep_faqs
         (id, job_post_id, resume_id, type, title, items, model_name, prompt_version, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.jobPostId,
          input.resumeId,
          input.type,
          input.title,
          JSON.stringify(input.items),
          input.modelName,
          input.promptVersion,
          input.createdAt,
        ],
      )
      for (const questionId of input.sourceQuestionIds) {
        await tx.execute(
          'INSERT INTO interview_prep_faq_sources (id, faq_id, question_id) VALUES (?, ?, ?)',
          [nanoid(), input.id, questionId],
        )
      }
    })
    return (await this.findFaqById(input.id))!
  },

  async listFaqSources(faqIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()
    if (faqIds.length === 0) return map
    const placeholders = faqIds.map(() => '?').join(', ')
    const rows = await db.query<FaqSourceRow>(
      `SELECT * FROM interview_prep_faq_sources WHERE faq_id IN (${placeholders})`,
      faqIds,
    )
    for (const row of rows) {
      map.set(row.faq_id, [...(map.get(row.faq_id) ?? []), row.question_id])
    }
    return map
  },
}
