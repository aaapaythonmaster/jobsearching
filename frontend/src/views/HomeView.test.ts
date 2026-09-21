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
    expect(wrapper.text()).toContain('Mom, life is an open wilderness')
    expect(wrapper.text()).not.toContain('把每一次求职推进')
    expect(wrapper.find('.color-bends-stub').exists()).toBe(true)
    expect(wrapper.find('.dot-field-stub').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('emits workspace entry when the whole preview is clicked', async () => {
    const { wrapper, router } = await mountHome()
    const preview = wrapper.get('.home-view__workspace-preview')
    expect(preview.attributes('role')).toBe('button')
    expect(preview.attributes('tabindex')).toBe('0')
    await preview.trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(router.currentRoute.value.name).toBe('home')
  })
})
