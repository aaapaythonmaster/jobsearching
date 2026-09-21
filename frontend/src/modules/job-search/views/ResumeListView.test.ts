import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import ResumeListView from './ResumeListView.vue'

const uploadResume = vi.fn().mockResolvedValue(undefined)

vi.mock('../store', () => ({
  useJobSearchStore: () => ({
    resumes: ref([]),
    loading: ref(false),
    error: ref(null),
    fetchResumes: vi.fn(),
    uploadResume,
    updateResume: vi.fn(),
    removeResume: vi.fn(),
  }),
}))

describe('ResumeListView upload entry', () => {
  it('uses an icon-only file picker while keeping form submission explicit', async () => {
    const wrapper = mount(ResumeListView, {
      global: {
        stubs: {
          BaseButton: { template: '<button><slot /></button>' },
          BaseEmpty: { template: '<div />' },
          BaseInput: { template: '<input />' },
        },
      },
    })
    const input = wrapper.get('.resume-upload__trigger input[type="file"]')
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' })
    Object.defineProperty(input.element, 'files', { value: [file] })

    expect(wrapper.get('.resume-upload h3').text()).toBe('上传简历')
    expect(wrapper.get('.resume-upload__trigger').text()).toBe('')
    expect(wrapper.get('.resume-upload__trigger').attributes('aria-label')).toBe('上传简历')
    expect(wrapper.find('.resume-upload__icon').exists()).toBe(true)

    await input.trigger('change')
    expect(uploadResume).not.toHaveBeenCalled()
    await wrapper.get('.resume-upload').trigger('submit')
    expect(uploadResume).toHaveBeenCalledWith({
      file,
      name: undefined,
      targetRole: undefined,
      notes: undefined,
    })
  })

  it('separates the resume collection from the empty editor state', () => {
    const wrapper = mount(ResumeListView, {
      global: {
        stubs: {
          BaseButton: { template: '<button><slot /></button>' },
          BaseEmpty: { template: '<div />' },
          BaseInput: { template: '<input />' },
        },
      },
    })
    expect(wrapper.find('[aria-label="简历列表"]').exists()).toBe(true)
    expect(wrapper.get('[aria-label="简历编辑"]').text()).toContain('选择一份简历')
  })
})
