import type { FastifyInstance } from 'fastify'
import { jobSearchController } from './job-search.controller'

export async function jobSearchRoutes(app: FastifyInstance) {
  app.get('/statuses', jobSearchController.listStatuses)
  app.post('/statuses', jobSearchController.createStatus)
  app.patch('/statuses/:id', jobSearchController.updateStatus)
  app.delete('/statuses/:id', jobSearchController.removeStatus)

  app.get('/jobs', jobSearchController.listJobPosts)
  app.post('/jobs/parse', jobSearchController.parseJobPost)
  app.post('/jobs/extract-jd-image', jobSearchController.extractJobPostImage)
  app.get('/jobs/:id/greetings', jobSearchController.listGreetingDrafts)
  app.get('/jobs/:id/tailored-resumes', jobSearchController.listTailoredResumesByJobPost)
  app.get('/jobs/:id', jobSearchController.getJobPost)
  app.post('/jobs', jobSearchController.createJobPost)
  app.patch('/jobs/:id', jobSearchController.updateJobPost)
  app.delete('/jobs/:id', jobSearchController.removeJobPost)
  app.post('/greetings/generate', jobSearchController.generateGreeting)
  app.post('/tailored-resumes/generate', jobSearchController.generateTailoredResume)
  app.get('/requirement-analyses', jobSearchController.listRequirementAnalyses)
  app.get('/requirement-analyses/:id', jobSearchController.getRequirementAnalysis)
  app.post('/requirement-analyses/generate', jobSearchController.generateRequirementAnalysis)

  app.get('/resumes', jobSearchController.listResumes)
  app.get('/resumes/:id', jobSearchController.getResume)
  app.post('/resumes/upload', jobSearchController.uploadResume)
  app.patch('/resumes/:id', jobSearchController.updateResume)
  app.delete('/resumes/:id', jobSearchController.removeResume)
}
