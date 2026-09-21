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

const originalScroll = HTMLElement.prototype.scrollIntoView
const scrollCalls: { target: HTMLElement; options: ScrollIntoViewOptions }[] = []
beforeEach(() => {
  scrollCalls.length = 0
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  )
  HTMLElement.prototype.scrollIntoView = function (options) {
    scrollCalls.push({ target: this, options: options as ScrollIntoViewOptions })
  }
})
afterEach(() => {
  HTMLElement.prototype.scrollIntoView = originalScroll
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('continuous landing and workspace', () => {
  it('keeps the landing above the workspace on the root route', async () => {
    const wrapper = await mountLayout('/')
    expect(wrapper.find('.home-view').exists()).toBe(true)
    expect(wrapper.find('.layout__sidebar').exists()).toBe(true)
    expect(wrapper.find('.layout__workspace main').exists()).toBe(true)
  })

  it('keeps workspace chrome on normal routes', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.get('.layout__sidebar').text()).toContain('求职工作台')
    expect(wrapper.get('.layout__sidebar').text()).toContain('面试')
    expect(wrapper.find('a[href="/interviews"]').exists()).toBe(true)
    expect(wrapper.findAll('.layout__nav-icon')).toHaveLength(5)
    expect(wrapper.findAll('.layout__nav-icon[aria-hidden="true"]')).toHaveLength(5)
    expect(wrapper.findAll('.layout__nav-index')).toHaveLength(0)
    expect(wrapper.get('.layout').classes()).not.toContain('layout--immersive')
    expect(wrapper.get('.layout__main').classes()).not.toContain('layout__main--immersive')
  })

  it('uses a persistent sidebar and a separate content column', async () => {
    const wrapper = await mountLayout('/normal')
    expect(wrapper.find('.layout__sidebar').exists()).toBe(true)
    expect(wrapper.find('.layout__content').exists()).toBe(true)
    expect(wrapper.find('.layout__header').exists()).toBe(false)
  })

  it('labels the active workspace context on deep links', async () => {
    const wrapper = await mountLayout('/job-search/resumes')
    expect(wrapper.get('.layout__context-title').text()).toBe('简历')
    expect(wrapper.get('.layout__context').attributes('aria-label')).toBe('当前工作区：简历')
    wrapper.unmount()
  })

  it.each([false, true])(
    'scrolls Get started into the workspace (reduced motion: %s)',
    async (reduced) => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: reduced })),
      )
      const wrapper = await mountLayout('/')
      await wrapper.get('.home-view__start').trigger('click')
      expect(scrollCalls.at(-1)?.target).toBe(wrapper.get('.layout__workspace').element)
      expect(scrollCalls.at(-1)?.options.behavior).toBe(reduced ? 'instant' : 'smooth')
      wrapper.unmount()
    },
  )

  it('opens functional deep links at the workbench', async () => {
    const wrapper = await mountLayout('/normal')
    expect(scrollCalls.at(-1)?.target).toBe(wrapper.get('.layout__workspace').element)
    expect(scrollCalls.at(-1)?.options.behavior).toBe('instant')
    wrapper.unmount()
  })

  it('returns to the landing when the workspace brand is clicked', async () => {
    const wrapper = await mountLayout('/normal')
    await wrapper.get('.layout__brand').trigger('click')
    await vi.waitFor(() =>
      expect(scrollCalls.at(-1)?.target).toBe(wrapper.get('.layout__landing').element),
    )
    expect(scrollCalls.at(-1)?.options.behavior).toBe('smooth')
    wrapper.unmount()
  })
})
