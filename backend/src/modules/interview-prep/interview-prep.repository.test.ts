import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

const testDirectory = mkdtempSync(join(tmpdir(), 'interview-prep-test-'))

process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_SQLITE_FILE = join(testDirectory, 'test.db')

let db: typeof import('@/db').db
let closeDb: typeof import('@/db').closeDb
let repository: typeof import('./interview-prep.repository').interviewPrepRepository

before(async () => {
  const database = await import('@/db')
  db = database.db
  closeDb = database.closeDb
  await database.initDb()
  repository = (await import('./interview-prep.repository')).interviewPrepRepository

  await db.execute(
    `INSERT INTO job_search_job_posts
     (id, company_name, job_title, job_direction, jd_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'job-old',
      '旧公司',
      '前端工程师',
      '前端',
      'JD',
      '2026-08-01T00:00:00.000Z',
      '2026-08-01T00:00:00.000Z',
    ],
  )
  await db.execute(
    `INSERT INTO job_search_job_posts
     (id, company_name, job_title, job_direction, jd_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'job-new',
      '新公司',
      '产品经理',
      '产品',
      'JD',
      '2026-08-02T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    ],
  )
  for (const [id, createdAt] of [
    ['question-1', '2026-08-10T10:00:00.000Z'],
    ['question-2', '2026-08-11T10:00:00.000Z'],
  ]) {
    await db.execute(
      `INSERT INTO interview_prep_questions
       (id, job_post_id, round_label, question_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'job-old', '初面', `问题 ${id}`, createdAt, createdAt],
    )
  }
})

after(async () => {
  await closeDb()
  rmSync(testDirectory, { recursive: true, force: true })
})

test('lists all jobs with question totals and most recent question first', async () => {
  assert.deepEqual(await repository.listProjectOverviews(), [
    {
      jobPostId: 'job-old',
      companyName: '旧公司',
      jobTitle: '前端工程师',
      questionCount: 2,
      latestQuestionAt: '2026-08-11T10:00:00.000Z',
    },
    {
      jobPostId: 'job-new',
      companyName: '新公司',
      jobTitle: '产品经理',
      questionCount: 0,
      latestQuestionAt: null,
    },
  ])
})
