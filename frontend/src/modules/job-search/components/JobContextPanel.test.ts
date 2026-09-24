import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import JobContextPanel from './JobContextPanel.vue'

const job = {
  id: 'job-1', companyName: '示例公司', jobTitle: '产品经理', jobDirection: '产品', city: '北京',
  salaryRange: null, sourcePlatform: 'Boss直聘', jobUrl: null, jdText: '原始 JD', statusId: null,
  notes: null, createdAt: '', updatedAt: '',
}
const updateJob = vi.fn().mockResolvedValue({ ...job, jdText: '修改后的 JD' })
const statuses = [{ id: 'status-1', name: '已投递', color: '#29ef87', sortOrder: 1 }]

vi.mock('@/modules/job-search/store', () => ({
  useJobSearchStore: () => ({
    contextJob: job,
    contextMode: 'detail',
    statuses,
    resumes: [],
    loading: false,
    setJobContextMode: vi.fn(),
    updateJob,
    fetchResumes: vi.fn(),
  }),
}))

vi.mock('@/modules/job-search/api', () => ({
  jobSearchApi: { listGreetingDrafts: vi.fn(), listTailoredResumes: vi.fn() },
}))

describe('JobContextPanel JD editing', () => {
  it('edits and saves the JD in the right panel', async () => {
    const wrapper = mount(JobContextPanel, {
      global: {
        stubs: {
          BaseButton: { props: ['loading', 'disabled'], template: '<button v-bind="$attrs"><slot /></button>' },
        },
      },
    })
    await wrapper.get('.job-context-panel__section-heading button').trigger('click')
    const editor = wrapper.get('[aria-label="编辑岗位 JD"]')
    await editor.setValue('修改后的 JD')
    await wrapper.get('.job-context-panel__jd-actions button').trigger('click')
    await vi.waitFor(() => expect(updateJob).toHaveBeenCalledWith('job-1', { jdText: '修改后的 JD', statusId: null }))
  })

  it('edits and saves the job status in the right panel', async () => {
    const wrapper = mount(JobContextPanel, {
      global: {
        stubs: {
          BaseButton: { props: ['loading', 'disabled'], template: '<button v-bind="$attrs"><slot /></button>' },
        },
      },
    })
    await wrapper.get('.job-context-panel__section-heading button').trigger('click')
    const statusSelect = wrapper.get('[aria-label="编辑岗位状态"]')
    expect(statusSelect.element.parentElement?.tagName).toBe('DD')
    expect(statusSelect.findAll('option').map((option) => option.text())).toEqual(['未设置', '已投递'])
    await statusSelect.setValue('status-1')
    await wrapper.get('.job-context-panel__jd-actions button').trigger('click')
    await vi.waitFor(() => expect(updateJob).toHaveBeenCalledWith('job-1', { jdText: '原始 JD', statusId: 'status-1' }))
  })
})
