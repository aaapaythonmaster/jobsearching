import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DotField from './DotField.vue'

describe('DotField', () => {
  it('renders a low-opacity canvas host for the background layer', () => {
    const wrapper = mount(DotField, { props: { opacity: 0.16 } })
    expect(wrapper.get('[data-testid="dot-field"]').attributes('data-opacity')).toBe('0.16')
    expect(wrapper.findAll('canvas')).toHaveLength(1)
    wrapper.unmount()
  })
})
