import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DefaultLayout from './DefaultLayout.vue'
import { useJobSearchStore } from '@/modules/job-search/store'

async function mountLayout(path: '/' | '/normal' | '/job-search/jobs' | '/job-search/resumes') {
  const pinia = createPinia()
  setActivePinia(pinia)
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
  return mount(DefaultLayout, { global: { plugins: [router, pinia], stubs: { RippleDistortion: true } } })
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

  it('renders top navigation and a profile entry on the landing page', async () => {
    const wrapper = await mountLayout('/')
    expect(wrapper.get('[aria-label="首页导航"]').text()).toContain('岗位')
    expect(wrapper.get('[aria-label="首页导航"]').text()).toContain('状态')
    expect(wrapper.get('[aria-label="首页导航"]').text()).toContain('分析')
    expect(wrapper.get('[aria-label="首页导航"]').text()).not.toContain('求职状态')
    expect(wrapper.get('.layout__home-logo').attributes('src')).toBe('/offer-logo-warm.png')
    expect(wrapper.find('[aria-label="个人资料"]').exists()).toBe(true)
  })

  it('does not render the removed workspace preview component', async () => {
    const wrapper = await mountLayout('/')
    expect(wrapper.find('.home-view__workspace-preview').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps workspace chrome on normal routes', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.get('.layout__sidebar').text()).toContain('秋/春招记录')
    expect(wrapper.get('.layout__sidebar').text()).toContain('面试')
    expect(wrapper.get('.layout__sidebar').text()).toContain('状态')
    expect(wrapper.get('.layout__sidebar').text()).not.toContain('求职状态')
    expect(wrapper.find('.layout__new-button').exists()).toBe(false)
    expect(wrapper.get('.layout__sidebar').text()).not.toContain('新建任务')
    expect(wrapper.get('.layout__brand-logo').attributes('src')).toBe('/offer-logo.png')
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
    expect(wrapper.get('.layout__main').attributes('aria-label')).toBe('中间工作区滚动区')
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

  it('uses the compact vertical spacing for the jobs workspace', async () => {
    const wrapper = await mountLayout('/job-search/jobs')
    expect(wrapper.get('.layout__main').classes()).toContain('layout__main--job')
    wrapper.unmount()
  })

  it('renders the selected job context in the right column without replacing the main workspace', async () => {
    const wrapper = await mountLayout('/job-search/jobs')
    const store = useJobSearchStore()
    store.openJobContext({
      id: 'job-1', companyName: '示例公司', jobTitle: 'AI 产品经理', jobDirection: 'AI 产品',
      city: '北京', salaryRange: '20-30K', sourcePlatform: 'Boss直聘', jobUrl: null,
      jdText: '岗位 JD', statusId: null, notes: null, createdAt: '', updatedAt: '',
    }, 'detail')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[aria-label="岗位上下文"]').text()).toContain('AI 产品经理')
    expect(wrapper.get('.layout__main').text()).not.toContain('岗位详情页')
    wrapper.unmount()
  })

  it('keeps the toolbar context without the redundant main-area status heading', async () => {
    const wrapper = await mountLayout('/job-search/resumes')
    expect(wrapper.get('.layout__toolbar-title').text()).toContain('简历')
    expect(wrapper.find('[aria-label="搜索"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="设置"]').exists()).toBe(false)
    expect(wrapper.find('.layout__main-heading').exists()).toBe(false)
    expect(wrapper.get('.layout__main').text()).not.toContain('当前工作区')
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
