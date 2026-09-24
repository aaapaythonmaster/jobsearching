import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StatusListView from './StatusListView.vue'

vi.mock('../store', () => ({
  useJobSearchStore: () => ({
    statuses: [{ id: 'status-1', name: '已投递', color: '#2563eb', sortOrder: 1 }],
    jobs: [
      { id: 'job-1', statusId: 'status-1' },
      { id: 'job-2', statusId: 'status-1' },
    ],
    loading: false,
    error: null,
    fetchStatuses: vi.fn(),
    fetchJobs: vi.fn(),
    createStatus: vi.fn(),
    updateStatus: vi.fn(),
    removeStatus: vi.fn(),
  }),
}))

describe('StatusListView stage semantics', () => {
  it('labels the stage list and keeps status meaning in text', () => {
    const wrapper = mount(StatusListView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, BaseButton: { template: '<button><slot /></button>' }, BaseInput: { template: '<input />' } } },
    })
    expect(wrapper.find('[aria-label="求职阶段列表"]').exists()).toBe(true)
    expect(wrapper.get('[data-status-name="已投递"]').text()).toContain('已投递')
  })

  it('shows counts in the analysis summary without repeating them in the status cards', () => {
    const wrapper = mount(StatusListView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, BaseButton: { template: '<button><slot /></button>' }, BaseInput: { template: '<input />' } } },
    })
    expect(wrapper.get('.status-summary-card').text()).toContain('2')
    expect(wrapper.find('.status-card__count').exists()).toBe(false)
  })

  it('uses the requested green palette for status colors', () => {
    const wrapper = mount(StatusListView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, BaseButton: { template: '<button><slot /></button>' }, BaseInput: { template: '<input />' } } },
    })
    const values = wrapper.findAll('[data-color-value]').map((swatch) => swatch.attributes('data-color-value'))
    expect(values).toEqual(['#e7fdf2', '#b8fad7', '#88f6bc', '#29ef87', '#09773d'])
    expect(wrapper.text()).not.toContain('雾感薄荷')
    expect(wrapper.text()).not.toContain('品牌亮绿')
  })

  it('marks the selected color with a check instead of an outer ring', async () => {
    const wrapper = mount(StatusListView, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, BaseButton: { template: '<button><slot /></button>' }, BaseInput: { template: '<input />' } } },
    })
    const selected = wrapper.get('[data-color-value="#29ef87"]')
    expect(selected.attributes('aria-checked')).toBe('true')
    expect(selected.find('.color-swatch__check').exists()).toBe(true)
  })
})
