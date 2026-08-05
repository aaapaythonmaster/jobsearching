import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { JobImageTask, JobPostCreateInput } from '../types'
import { createEmptyJobDraft } from '../composables/useJobImageQueue'
import JobDraftReview from './JobDraftReview.vue'

const readyTask = (draft: JobPostCreateInput): JobImageTask => ({
  id: 'task-1',
  file: new File(['image'], '岗位截图.png', { type: 'image/png' }),
  previewUrl: 'blob:岗位截图.png',
  status: 'ready',
  draft,
  error: null,
  removed: false,
})

describe('JobDraftReview', () => {
  it('blocks save and shows required fields when the active draft is incomplete', async () => {
    const wrapper = mount(JobDraftReview, {
      props: { task: readyTask(createEmptyJobDraft()), statuses: [] },
    })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.text()).toContain('请填写公司、岗位、方向和 JD 原文')
  })

  it('emits a complete draft on save', async () => {
    const draft = {
      ...createEmptyJobDraft(),
      companyName: 'A 公司',
      jobTitle: '产品经理',
      jobDirection: 'AI 产品',
      jdText: '完整 JD',
    }
    const wrapper = mount(JobDraftReview, { props: { task: readyTask(draft), statuses: [] } })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      companyName: 'A 公司',
      jobTitle: '产品经理',
    })
  })

  it('emits draft edits without saving', async () => {
    const wrapper = mount(JobDraftReview, {
      props: { task: readyTask({ ...createEmptyJobDraft(), jdText: 'JD' }), statuses: [] },
    })

    await wrapper.get('input[placeholder="公司名称"]').setValue('新公司')

    expect(wrapper.emitted('update:draft')?.at(-1)?.[0]).toMatchObject({ companyName: '新公司' })
  })
})
