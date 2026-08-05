import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { JobImageTask } from '../types'
import { createEmptyJobDraft } from '../composables/useJobImageQueue'
import JobImageQueue from './JobImageQueue.vue'

const image = (name: string) => new File(['image'], name, { type: 'image/png' })

function task(status: JobImageTask['status'] = 'ready'): JobImageTask {
  return {
    id: 'task-1',
    file: image('岗位截图.png'),
    previewUrl: 'blob:岗位截图.png',
    status,
    draft: createEmptyJobDraft(),
    error: status === 'extract_failed' ? 'OCR 失败' : null,
    removed: false,
  }
}

describe('JobImageQueue', () => {
  it('emits all chosen files and resets the native input', async () => {
    const wrapper = mount(JobImageQueue, {
      props: { tasks: [], selectedTaskId: null, processing: false },
    })
    const input = wrapper.get('input[type="file"]')
    const files = [image('one.png'), image('two.png')]
    Object.defineProperty(input.element, 'files', { value: files, configurable: true })

    await input.trigger('change')

    expect(wrapper.emitted('files')?.[0]).toEqual([files])
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(input.attributes('multiple')).toBeDefined()
  })

  it('emits selection for the chosen task', async () => {
    const wrapper = mount(JobImageQueue, {
      props: { tasks: [task()], selectedTaskId: null, processing: false },
    })

    await wrapper.get('[data-testid="job-image-task-task-1"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual(['task-1'])
  })

  it('offers retry for a failed recognition task', async () => {
    const wrapper = mount(JobImageQueue, {
      props: { tasks: [task('extract_failed')], selectedTaskId: 'task-1', processing: false },
    })

    await wrapper.get('[aria-label="重试 岗位截图.png"]').trigger('click')

    expect(wrapper.emitted('retry')?.[0]).toEqual(['task-1'])
  })
})
