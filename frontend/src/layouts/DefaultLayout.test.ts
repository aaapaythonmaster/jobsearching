import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DefaultLayout from './DefaultLayout.vue'

async function mountLayout(path: '/' | '/normal' | '/job-search/resumes') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: { template: '<RouterView />' },
        children: [
          {
            path: '',
            component: { template: '<div>Home</div>' },
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
  return mount(DefaultLayout, { global: { plugins: [router], stubs: { RippleDistortion: true } } })
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('landing and fullscreen workspace', () => {
  it('renders only the landing on the root route', async () => {
    const wrapper = await mountLayout('/')
    expect(wrapper.find('.home-view').exists()).toBe(true)
    expect(wrapper.find('.layout__workspace').exists()).toBe(false)
  })

  it('navigates from the workspace preview to the jobs workspace', async () => {
    const wrapper = await mountLayout('/')
    await wrapper.get('.home-view__workspace-preview').trigger('click')
    await vi.waitFor(() => expect(routerPath(wrapper)).toBe('/job-search/jobs'))
    expect(wrapper.find('.layout__workspace').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps workspace chrome on normal routes', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.get('.layout__sidebar').text()).toContain('求职工作台')
    expect(wrapper.get('.layout__sidebar').text()).toContain('面试')
    expect(wrapper.find('a[href="/interviews"]').exists()).toBe(true)
    expect(wrapper.findAll('.workspace-nav-icon')).toHaveLength(5)
    expect(wrapper.findAll('.workspace-nav-icon[aria-hidden="true"]')).toHaveLength(5)
    expect(wrapper.findAll('.layout__nav-index')).toHaveLength(0)
    expect(wrapper.get('.layout__workspace').classes()).toContain('layout__workspace--fullscreen')
    expect(wrapper.find('.layout__landing').exists()).toBe(false)
  })

  it('uses a persistent sidebar and a separate content column', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.find('.layout__sidebar').exists()).toBe(true)
    expect(wrapper.find('.layout__main').exists()).toBe(true)
    expect(wrapper.find('.layout__header').exists()).toBe(false)
  })

  it('renders the three desktop workspace columns', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.find('.layout__sidebar').exists()).toBe(true)
    expect(wrapper.find('.layout__main-column').exists()).toBe(true)
    expect(wrapper.find('.layout__context-column').exists()).toBe(true)
    expect(wrapper.find('[aria-label="上下文面板"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows route-specific context content in the right column', async () => {
    const wrapper = await mountLayout('/job-search/resumes')
    expect(wrapper.get('[aria-label="上下文面板"]').text()).toContain('简历预览')
    expect(wrapper.get('[aria-label="上下文面板"]').text()).toContain('选择一份简历')
    wrapper.unmount()
  })

  it('labels the active workspace context on deep links', async () => {
    const wrapper = await mountLayout('/job-search/resumes')
    expect(wrapper.get('.layout__context-title').text()).toBe('简历')
    expect(wrapper.get('.layout__main-heading').text()).toContain('简历')
    wrapper.unmount()
  })

  it('returns to the landing route when the workspace brand is clicked', async () => {
    const wrapper = await mountLayout('/normal')
    await wrapper.get('.layout__brand').trigger('click')
    await vi.waitFor(() => expect(routerPath(wrapper)).toBe('/'))
    wrapper.unmount()
  })
})

function routerPath(wrapper: ReturnType<typeof mount>) {
  return wrapper.vm.$route.path
}
