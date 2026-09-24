import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkspaceNavIcon from './WorkspaceNavIcon.vue'

describe('WorkspaceNavIcon', () => {
  it.each(['briefcase', 'file-text', 'trend', 'kanban', 'message-square'] as const)('%s uses the Morphicons stroke contract', (name) => {
    const wrapper = mount(WorkspaceNavIcon, { props: { name } })
    const svg = wrapper.get('svg')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.attributes('height')).toBe('20')
    expect(svg.attributes('stroke-width')).toBe('1.75')
    expect(svg.attributes('stroke-linecap')).toBe('round')
    expect(svg.attributes('stroke-linejoin')).toBe('round')
  })
})
