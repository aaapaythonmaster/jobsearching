import type { RouteRecordRaw } from 'vue-router'

export const interviewPrepRoutes: RouteRecordRaw[] = [
  {
    path: 'interviews',
    name: 'interview-overview',
    component: () => import('./views/InterviewOverviewView.vue'),
  },
  {
    path: 'interviews/:jobPostId',
    name: 'interview-question-review',
    component: () => import('./views/InterviewQuestionReviewView.vue'),
  },
  {
    path: 'job-search/jobs/:jobPostId/interview-prep',
    name: 'interview-prep-project',
    component: () => import('./views/InterviewPrepView.vue'),
  },
]
