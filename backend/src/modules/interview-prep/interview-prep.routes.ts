import type { FastifyInstance } from 'fastify'
import { interviewPrepController } from './interview-prep.controller'

export async function interviewPrepRoutes(app: FastifyInstance) {
  app.get('/projects', interviewPrepController.listProjectOverviews)
  app.get('/projects/:jobPostId/summary', interviewPrepController.getProjectSummary)
  app.put('/projects/:jobPostId/resume-binding', interviewPrepController.bindResume)
  app.get('/projects/:jobPostId/questions', interviewPrepController.listQuestions)
  app.post('/projects/:jobPostId/questions', interviewPrepController.createQuestion)
  app.get('/projects/:jobPostId/intros', interviewPrepController.listIntroVersions)
  app.post('/projects/:jobPostId/generate-intro', interviewPrepController.generateIntro)
  app.get('/projects/:jobPostId/faqs', interviewPrepController.listFaqs)
  app.post('/projects/:jobPostId/generate-summary-faq', interviewPrepController.generateSummaryFaq)
  app.post('/projects/:jobPostId/generate-deep-faq', interviewPrepController.generateDeepFaq)
  app.patch('/questions/:questionId', interviewPrepController.updateQuestion)
  app.delete('/questions/:questionId', interviewPrepController.removeQuestion)
  app.get('/questions/:questionId/answer-versions', interviewPrepController.listAnswerVersions)
  app.post('/questions/:questionId/review-answer', interviewPrepController.reviewAnswer)
  app.get('/faqs/:faqId', interviewPrepController.getFaq)
}
