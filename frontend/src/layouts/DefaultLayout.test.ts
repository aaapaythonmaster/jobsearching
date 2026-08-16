import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import DefaultLayout from './DefaultLayout.vue'

async function mountLayout(path: '/' | '/normal') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: DefaultLayout,
        children: [
          {
            path: '',
            component: { template: '<div>Home</div>' },
            meta: { immersive: true },
          },
          { path: 'normal', component: { template: '<div>Normal</div>' } },
          { path: 'job-search/jobs', component: { template: '<div>Jobs</div>' } },
          { path: 'job-search/resumes', component: { template: '<div>Resumes</div>' } },
          { path: 'job-search/analysis', component: { template: '<div>Analysis</div>' } },
          { path: 'job-search/statuses', component: { template: '<div>Statuses</div>' } },
          { path: 'interviews', component: { template: '<div>Interviews</div>' } },
        ],
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(DefaultLayout, { global: { plugins: [router] } })
}

describe('DefaultLayout immersive mode', () => {
  it('removes workspace chrome and constraints on the home route', async () => {
    const wrapper = await mountLayout('/')
    expect(wrapper.find('.layout__header').exists()).toBe(false)
    expect(wrapper.get('.layout').classes()).toContain('layout--immersive')
    expect(wrapper.get('.layout__main').classes()).toContain('layout__main--immersive')
  })

  it('keeps workspace chrome on normal routes', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.get('.layout__header').text()).toContain('求职工作台')
    expect(wrapper.get('.layout__header').text()).toContain('面试')
    expect(wrapper.find('a[href="/interviews"]').exists()).toBe(true)
    expect(wrapper.get('.layout').classes()).not.toContain('layout--immersive')
    expect(wrapper.get('.layout__main').classes()).not.toContain('layout__main--immersive')
  })
})
