import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import RequirementAnalysisView from './RequirementAnalysisView.vue'

const mocks = vi.hoisted(() => ({ listRequirementAnalyses: vi.fn(), fetchJobs: vi.fn() }))

vi.mock('../api', () => ({
  jobSearchApi: { listRequirementAnalyses: mocks.listRequirementAnalyses },
}))

vi.mock('../store', () => ({
  useJobSearchStore: () => ({ jobs: [], fetchJobs: mocks.fetchJobs }),
}))

describe('RequirementAnalysisView decision sections', () => {
  it('separates analysis problems and recommended actions', async () => {
    mocks.listRequirementAnalyses.mockResolvedValueOnce([
    {
      id: 'analysis-1', title: '产品方向共性', summary: '需要关注用户研究和数据分析。',
      createdAt: '2026-09-21T08:00:00.000Z',
      groupedResult: { groups: [{ jobDirection: '产品经理', jobPostCount: 2, commonSkills: ['用户研究'], commonExperience: [], commonTools: ['SQL'], softRequirements: [], niceToHave: [], riskNotes: ['缺少量化成果'] }] },
    },
    ])
    const wrapper = mount(RequirementAnalysisView, {
      global: {
        stubs: {
          BaseButton: { template: '<button><slot /></button>' },
          BaseEmpty: { template: '<div />' },
          BaseInput: { template: '<input />' },
        },
      },
    })
    await vi.waitFor(() => expect(wrapper.find('.analysis-result').exists()).toBe(true))
    expect(wrapper.find('[aria-label="分析问题"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="分析建议"]').text()).toContain('建议动作')
  })

  it('shows a Chinese retry message when the analysis request cannot reach the backend', async () => {
    mocks.listRequirementAnalyses.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const wrapper = mount(RequirementAnalysisView, {
      global: {
        stubs: {
          BaseButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          BaseEmpty: { template: '<div />' },
          BaseInput: { template: '<input />' },
        },
      },
    })
    await vi.waitFor(() => expect(wrapper.find('.state--error').exists()).toBe(true))
    expect(wrapper.get('.state--error').text()).toContain('后端服务暂时不可用')
    expect(wrapper.find('[aria-label="重试分析"]').exists()).toBe(true)
  })
})
