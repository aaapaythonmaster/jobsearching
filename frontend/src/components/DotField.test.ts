import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DotField from './DotField.vue'

describe('DotField', () => {
  it('renders a low-opacity canvas host for the background layer', () => {
    const wrapper = mount(DotField, { props: { dotOpacity: 0.16 } })
    expect(wrapper.get('[data-testid="dot-field"]').attributes('data-opacity')).toBe('0.16')
    expect(wrapper.findAll('canvas')).toHaveLength(1)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('[data-dot-spacing="14"]').exists()).toBe(true)
    expect(wrapper.find('.dot-field__glow-layer').exists()).toBe(true)
    expect(wrapper.find('.dot-field::before').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the official dot field runtime hooks', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile(`${process.cwd()}/src/components/DotField.vue`, 'utf8'))
    expect(source).toContain('rebuildRef')
    expect(source).toContain('frameCount * 0.02')
    expect(source).toContain('glowOpacity')
  })

  it('draws one static frame when reduced motion is requested', () => {
    const context = {
      setTransform: vi.fn(), clearRect: vi.fn(), createLinearGradient: () => ({ addColorStop: vi.fn() }),
      beginPath: vi.fn(), moveTo: vi.fn(), arc: vi.fn(), fill: vi.fn(),
    }
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const scheduled: FrameRequestCallback[] = []
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      scheduled.push(callback)
      return scheduled.length
    })
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    try {
      const wrapper = mount(DotField)
      expect(scheduled).toHaveLength(1)
      scheduled[0](16)
      expect(context.fill).toHaveBeenCalledOnce()
      expect(scheduled).toHaveLength(1)
      wrapper.unmount()
    } finally {
      getContext.mockRestore()
      raf.mockRestore()
      matchMedia.mockRestore()
    }
  })
})
