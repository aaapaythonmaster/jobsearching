import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StatusListView from './StatusListView.vue'

vi.mock('../store', () => ({
  useJobSearchStore: () => ({
    statuses: [{ id: 'status-1', name: '已投递', color: '#2563eb', sortOrder: 1 }],
    loading: false,
    error: null,
    fetchStatuses: vi.fn(),
    createStatus: vi.fn(),
    updateStatus: vi.fn(),
    removeStatus: vi.fn(),
  }),
}))

describe('StatusListView stage semantics', () => {
  it('labels the stage list and keeps status meaning in text', () => {
    const wrapper = mount(StatusListView, {
      global: { stubs: { BaseButton: { template: '<button><slot /></button>' }, BaseInput: { template: '<input />' } } },
    })
    expect(wrapper.find('[aria-label="求职阶段列表"]').exists()).toBe(true)
    expect(wrapper.get('[data-status-name="已投递"]').text()).toContain('已投递')
  })
})
