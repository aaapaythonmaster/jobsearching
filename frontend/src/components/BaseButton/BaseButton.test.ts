import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Trae primary button tokens', () => {
  it('uses the green black 13px action treatment', () => {
    const style = readFileSync('src/components/BaseButton/style.less', 'utf8')
    const tokens = readFileSync('src/styles/variables.less', 'utf8')
    expect(tokens).toContain('@color-action: #32f08c')
    expect(tokens).toContain('@color-action-text: #0a0b0d')
    expect(style).toContain('background: @color-action')
    expect(style).toContain('color: @color-action-text')
    expect(style).toContain('font-size: 13px')
    expect(style).toContain('padding: 0 12px')
    expect(style).toContain('white-space: nowrap')
  })

  it('uses a neutral black-on-gray treatment for destructive actions', () => {
    const style = readFileSync('src/components/BaseButton/style.less', 'utf8')
    expect(style).toContain('background-color: @color-bg-muted')
    expect(style).toContain('color: @color-text')
  })
})
