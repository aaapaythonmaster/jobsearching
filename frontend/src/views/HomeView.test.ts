import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeView from './HomeView.vue'

vi.mock('@/assets/landing/background-ocean.jpg', () => ({ default: '/ocean.jpg' }))
vi.mock('@/assets/landing/background-hills.jpg', () => ({ default: '/hills.jpg' }))

const RippleStub = {
  props: ['src'],
  template: '<div class="ripple-stub" :data-src="src" />',
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

afterEach(() => vi.restoreAllMocks())

describe('HomeView', () => {
  it('selects one background and keeps it stable for the mounted visit', async () => {
    const { wrapper } = await mountHome(0)
    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/ocean.jpg')

    vi.mocked(Math.random).mockReturnValue(0.99)
    wrapper.vm.$forceUpdate()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/ocean.jpg')
  })

  it('enters the existing job workspace', async () => {
    const { router, wrapper } = await mountHome(0.99)
    expect(wrapper.get('.ripple-stub').attributes('data-src')).toBe('/hills.jpg')

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('job-search-jobs'))
  })

  it('renders no marketing copy beyond the requested CTA', async () => {
    const { wrapper } = await mountHome(0)
    expect(wrapper.text()).toBe('Get started')
  })
})
