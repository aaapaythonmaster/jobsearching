import type { RouteRecordRaw } from 'vue-router'

export const jobWorkspaceView = () => import('./views/JobListView.vue')

export const jobSearchRoutes: RouteRecordRaw[] = [
  {
    path: 'job-search/jobs',
    name: 'job-search-jobs',
    component: jobWorkspaceView,
  },
  {
    path: 'job-search/jobs/:id',
    name: 'job-search-job-detail',
    component: () => import('./views/JobDetailView.vue'),
  },
  {
    path: 'job-search/resumes',
    name: 'job-search-resumes',
    component: () => import('./views/ResumeListView.vue'),
  },
  {
    path: 'job-search/analysis',
    name: 'job-search-analysis',
    component: () => import('./views/RequirementAnalysisView.vue'),
  },
  {
    path: 'job-search/statuses',
    name: 'job-search-statuses',
    component: () => import('./views/StatusListView.vue'),
  },
]
