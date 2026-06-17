CREATE TABLE IF NOT EXISTS job_search_resumes (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  target_role       TEXT,
  source_file_name  TEXT NOT NULL,
  source_file_type  TEXT NOT NULL,
  source_file_path  TEXT NOT NULL,
  source_file_size  INTEGER NOT NULL,
  extracted_text    TEXT NOT NULL,
  content_text      TEXT NOT NULL,
  notes             TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_search_resumes_updated_at
  ON job_search_resumes (updated_at);

CREATE TABLE IF NOT EXISTS job_search_statuses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_search_statuses_sort_order
  ON job_search_statuses (sort_order);

CREATE TABLE IF NOT EXISTS job_search_job_posts (
  id                TEXT PRIMARY KEY,
  company_name      TEXT NOT NULL,
  job_title         TEXT NOT NULL,
  job_direction     TEXT NOT NULL,
  city              TEXT,
  salary_range      TEXT,
  source_platform   TEXT,
  job_url           TEXT,
  jd_text           TEXT NOT NULL,
  status_id         TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  FOREIGN KEY (status_id) REFERENCES job_search_statuses(id)
);

CREATE INDEX IF NOT EXISTS idx_job_search_job_posts_status_id
  ON job_search_job_posts (status_id);

CREATE INDEX IF NOT EXISTS idx_job_search_job_posts_direction
  ON job_search_job_posts (job_direction);

CREATE INDEX IF NOT EXISTS idx_job_search_job_posts_updated_at
  ON job_search_job_posts (updated_at);

CREATE TABLE IF NOT EXISTS job_search_greeting_drafts (
  id              TEXT PRIMARY KEY,
  job_post_id     TEXT NOT NULL,
  job_snapshot    TEXT NOT NULL,
  content         TEXT NOT NULL,
  style           TEXT,
  model_name      TEXT,
  prompt_version  TEXT,
  created_at      TEXT NOT NULL,
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_job_search_greeting_drafts_job_post_id
  ON job_search_greeting_drafts (job_post_id);

CREATE TABLE IF NOT EXISTS job_search_tailored_resumes (
  id               TEXT PRIMARY KEY,
  resume_id        TEXT NOT NULL,
  job_post_id      TEXT NOT NULL,
  resume_snapshot  TEXT NOT NULL,
  job_snapshot     TEXT NOT NULL,
  content          TEXT NOT NULL,
  change_notes     TEXT NOT NULL,
  risk_notes       TEXT NOT NULL,
  model_name       TEXT,
  prompt_version   TEXT,
  created_at       TEXT NOT NULL,
  FOREIGN KEY (resume_id) REFERENCES job_search_resumes(id),
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_job_search_tailored_resumes_resume_id
  ON job_search_tailored_resumes (resume_id);

CREATE INDEX IF NOT EXISTS idx_job_search_tailored_resumes_job_post_id
  ON job_search_tailored_resumes (job_post_id);

CREATE TABLE IF NOT EXISTS job_search_requirement_analyses (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  job_post_ids    TEXT NOT NULL,
  grouped_result  TEXT NOT NULL,
  summary         TEXT NOT NULL,
  model_name      TEXT,
  prompt_version  TEXT,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_search_requirement_analyses_created_at
  ON job_search_requirement_analyses (created_at);
