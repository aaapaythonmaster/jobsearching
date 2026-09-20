import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeView from './HomeView.vue'

vi.mock('@/assets/landing/background-ocean.jpg', () => ({ default: '/ocean.jpg' }))
vi.mock('@/assets/landing/background-hills.jpg', () => ({ default: '/hills.jpg' }))

const RippleStub = {
  props: ['src', 'enabled'],
  template: '<div class="ripple-stub" :data-src="src" :data-enabled="enabled" />',
}

async function mountHome(randomValue: number) {
  vi.spyOn(Math, 'random').mockReturnValue(randomValue)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      {
        path: '/job-search/jobs',
        name: 'job-search-jobs',
        component: { template: '<div>Jobs</div>' },
      },
    ],
  })
  await router.push('/')
  await router.isReady()
  return {
    router,
    wrapper: mount(HomeView, {
      global: { plugins: [router], stubs: { RippleDistortion: RippleStub } },
    }),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('HomeView', () => {
  it('pauses the ripple while the landing is offscreen', async () => {
    let notify: IntersectionObserverCallback | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const { wrapper } = await mountHome(0)
    notify?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver)
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.ripple-stub').attributes('data-enabled')).toBe('false')
    notify?.(
      [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.ripple-stub').attributes('data-enabled')).toBe('true')
    wrapper.unmount()
  })
  it('selects one background and keeps it stable for the mounted visit', async () => {
    const { wrapper } = await mountHome(0)
    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/ocean.jpg')

    vi.mocked(Math.random).mockReturnValue(0.99)
    wrapper.vm.$forceUpdate()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/ocean.jpg')
  })

  it('requests workspace entry without replacing the landing route', async () => {
    const { router, wrapper } = await mountHome(0.99)
    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/hills.jpg')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('introduces a tool-oriented split hero without changing CTA behavior', async () => {
    const { wrapper } = await mountHome(0)
    expect(wrapper.get('.home-view__headline').text()).toBe('把每一次求职推进，变成可见的下一步。')
    expect(wrapper.get('.home-view__copy p').text()).toContain('岗位、简历、面试问题')
    expect(wrapper.find('.home-view__visual').exists()).toBe(true)
    expect(wrapper.get('.home-view__insight').text()).toContain('本周求职进度')
    expect(wrapper.get('.home-view__start').text()).toBe('Get started')
    expect(wrapper.get('.home-view__note').text()).toContain('从岗位收集开始')
  })
})
