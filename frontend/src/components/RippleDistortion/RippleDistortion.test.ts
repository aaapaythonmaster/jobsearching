import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RippleDistortion from './index.vue'

const rendererMock = vi.hoisted(() => vi.fn())

vi.mock('ogl', () => ({
  Renderer: rendererMock,
  Program: vi.fn(),
  Mesh: vi.fn(),
  Geometry: vi.fn(),
  Triangle: vi.fn(),
  Texture: vi.fn(),
  RenderTarget: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  rendererMock.mockReset()
})

describe('RippleDistortion fallbacks', () => {
  it('stays static when reduced motion is requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    const wrapper = mount(RippleDistortion, { props: { src: '/background.jpg' } })

    expect(wrapper.attributes('data-ripple-state')).toBe('static')
    expect(wrapper.attributes('style')).toContain('background-image')
    expect(rendererMock).not.toHaveBeenCalled()
  })

  it('keeps the static image when renderer creation fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    rendererMock.mockImplementation(() => {
      throw new Error('WebGL unavailable')
    })

    const wrapper = mount(RippleDistortion, { props: { src: '/background.jpg' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('data-ripple-state')).toBe('error')
    expect(wrapper.attributes('style')).toContain('background-image')
  })
})
