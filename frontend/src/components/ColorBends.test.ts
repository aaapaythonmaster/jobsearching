import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ColorBends from './ColorBends.vue'
import { colorBendsFragment, colorBendsVertex } from './colorBendsShaders'

describe('ColorBends', () => {
  it('renders a full-size color bends canvas host with the configured color', () => {
    const wrapper = mount(ColorBends, { props: { colors: ['#32F08C'], speed: 0.2, rotation: 90 } })
    expect(wrapper.get('[data-testid="color-bends"]').attributes('data-colors')).toBe('#32F08C')
    expect(wrapper.get('[data-testid="color-bends"]').attributes('data-rotation')).toBe('90')
    expect(wrapper.find('.color-bends__fallback').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses the Three.js fullscreen plane vertex shader contract', () => {
    expect(colorBendsVertex).toContain('vUv = uv;')
    expect(colorBendsVertex).toContain('gl_Position = vec4(position, 1.0);')
  })

  it('keeps the official color-band shader controls', () => {
    expect(colorBendsFragment).toContain('uColors[MAX_COLORS]')
    expect(colorBendsFragment).toContain('uIterations')
    expect(colorBendsFragment).toContain('uPointer')
    expect(colorBendsFragment).toContain('vec2 disp = (r - s) * kBelow;')
    expect(colorBendsFragment).toContain('float m1 = length(warped + sin')
  })

  it('uses the official renderer color space and clock-based animation contract', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile(`${process.cwd()}/src/components/ColorBends.vue`, 'utf8'))
    expect(source).toContain('renderer.outputColorSpace = THREE.SRGBColorSpace')
    expect(source).toContain('new THREE.Clock()')
    expect(source).toContain('prefers-reduced-motion')
    expect(source).toMatch(/try\s*\{[\s\S]*?renderer\.render\(scene, camera\)[\s\S]*?catch \(error\)/)
    expect(source).toContain("window.addEventListener('resize', resize)")
  })
})
