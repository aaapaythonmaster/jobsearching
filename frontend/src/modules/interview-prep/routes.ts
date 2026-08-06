import type { RouteRecordRaw } from 'vue-router'

export const interviewPrepRoutes: RouteRecordRaw[] = [
  {
    path: 'job-search/jobs/:jobPostId/interview-prep',
    name: 'interview-prep-project',
    component: () => import('./views/InterviewPrepView.vue'),
  },
]
