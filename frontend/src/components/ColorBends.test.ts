import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ColorBends from './ColorBends.vue'

describe('ColorBends', () => {
  it('renders a full-size color bends canvas host with the configured color', () => {
    const wrapper = mount(ColorBends, { props: { colors: ['#32F08C'], speed: 0.2, rotation: 90 } })
    expect(wrapper.get('[data-testid="color-bends"]').attributes('data-colors')).toBe('#32F08C')
    expect(wrapper.get('[data-testid="color-bends"]').attributes('data-rotation')).toBe('90')
    expect(wrapper.find('.color-bends__fallback').exists()).toBe(true)
    wrapper.unmount()
  })
})
