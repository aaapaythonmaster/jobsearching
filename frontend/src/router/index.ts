import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

import { interviewPrepRoutes } from '@/modules/interview-prep'
import { jobSearchRoutes, jobWorkspaceView } from '@/modules/job-search'
import { todoRoutes } from '@/modules/todo'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: jobWorkspaceView,
      },
      ...jobSearchRoutes,
      ...interviewPrepRoutes,
      ...todoRoutes,
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
