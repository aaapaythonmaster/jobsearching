import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const less = createRequire(import.meta.url)('less') as {
  render: (source: string) => Promise<{ css: string }>
}

function luminance(channels: number[]) {
  const linear = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
}

function rgb(value: string) {
  if (value.startsWith('#')) {
    const hex = value.slice(1)
    const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
    return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16))
  }
  const channels = value.match(/[\d.]+/g)!.map(Number)
  const alpha = channels[3] ?? 1
  return channels.slice(0, 3).map((channel) => channel * alpha + 255 * (1 - alpha))
}

describe('light workspace readability', () => {
  it('keeps reading text legible and panels light on the shared daylight backdrop', async () => {
    const tokens = readFileSync('src/styles/variables.less', 'utf8')
    const { css } = await less.render(`${tokens}\n.sample { color: @color-text; border-color: @color-text-secondary; background: @color-bg-elevated; }`)
    const foreground = css.match(/\n  color: ([^;]+);/)![1]!
    const secondary = css.match(/border-color: ([^;]+);/)![1]!
    const surface = css.match(/background: ([^;]+);/)![1]!
    expect(1.05 / (luminance(rgb(foreground)) + 0.05)).toBeGreaterThanOrEqual(4.5)
    expect(1.05 / (luminance(rgb(secondary)) + 0.05)).toBeGreaterThanOrEqual(4.5)
    expect(luminance(rgb(surface))).toBeGreaterThan(0.85)
  })
})
