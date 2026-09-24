import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import HomeView from './HomeView.vue'

async function mountHome() {
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
      global: {
        plugins: [router],
        stubs: {
          ColorBends: { template: '<div class="color-bends-stub" />' },
          DotField: { template: '<div class="dot-field-stub" />' },
        },
      },
    }),
  }
}

describe('HomeView', () => {
  it('shows only the new split copy and the two layered backgrounds', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.text()).toContain('Job is on its way')
    expect(wrapper.text()).not.toContain('Mom, life is an open wilderness')
    expect(wrapper.findAll('.home-view__line--calligraphy')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('把每一次求职推进')
    expect(wrapper.find('.color-bends-stub').exists()).toBe(true)
    expect(wrapper.find('.dot-field-stub').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('does not render the removed workspace preview component', async () => {
    const { wrapper } = await mountHome()
    expect(wrapper.find('.home-view__workspace-preview').exists()).toBe(false)
  })
})
