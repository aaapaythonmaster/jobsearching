CREATE TABLE IF NOT EXISTS interview_prep_project_resumes (
  id           TEXT PRIMARY KEY,
  job_post_id  TEXT NOT NULL,
  resume_id    TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id),
  FOREIGN KEY (resume_id) REFERENCES job_search_resumes(id),
  UNIQUE (job_post_id)
);

CREATE TABLE IF NOT EXISTS interview_prep_questions (
  id             TEXT PRIMARY KEY,
  job_post_id    TEXT NOT NULL,
  round_label    TEXT NOT NULL,
  custom_round   TEXT,
  question_text  TEXT NOT NULL,
  user_answer    TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_job_post_id
  ON interview_prep_questions (job_post_id);

CREATE TABLE IF NOT EXISTS interview_prep_answer_versions (
  id                    TEXT PRIMARY KEY,
  question_id           TEXT NOT NULL,
  job_post_id           TEXT NOT NULL,
  user_answer_snapshot  TEXT,
  analysis              TEXT NOT NULL,
  reference_answer      TEXT NOT NULL,
  model_name            TEXT,
  prompt_version        TEXT,
  created_at            TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES interview_prep_questions(id),
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id)
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_answer_versions_question_id
  ON interview_prep_answer_versions (question_id);

CREATE TABLE IF NOT EXISTS interview_prep_intro_versions (
  id                       TEXT PRIMARY KEY,
  job_post_id              TEXT NOT NULL,
  resume_id                TEXT NOT NULL,
  duration_label           TEXT NOT NULL,
  custom_duration_minutes  INTEGER,
  content                  TEXT NOT NULL,
  model_name               TEXT,
  prompt_version           TEXT,
  created_at               TEXT NOT NULL,
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id),
  FOREIGN KEY (resume_id) REFERENCES job_search_resumes(id)
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_intro_versions_job_post_id
  ON interview_prep_intro_versions (job_post_id);

CREATE TABLE IF NOT EXISTS interview_prep_faqs (
  id              TEXT PRIMARY KEY,
  job_post_id     TEXT NOT NULL,
  resume_id       TEXT,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  items           TEXT NOT NULL,
  model_name      TEXT,
  prompt_version  TEXT,
  created_at      TEXT NOT NULL,
  FOREIGN KEY (job_post_id) REFERENCES job_search_job_posts(id),
  FOREIGN KEY (resume_id) REFERENCES job_search_resumes(id)
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_faqs_job_post_id
  ON interview_prep_faqs (job_post_id);

CREATE TABLE IF NOT EXISTS interview_prep_faq_sources (
  id           TEXT PRIMARY KEY,
  faq_id       TEXT NOT NULL,
  question_id  TEXT NOT NULL,
  FOREIGN KEY (faq_id) REFERENCES interview_prep_faqs(id),
  FOREIGN KEY (question_id) REFERENCES interview_prep_questions(id),
  UNIQUE (faq_id, question_id)
);
