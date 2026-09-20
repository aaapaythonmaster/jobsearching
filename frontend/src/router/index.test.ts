import { describe, expect, it } from 'vitest'
import { routes } from './index'

describe('root route', () => {
  it('provides a workspace below the landing without redirecting the root', () => {
    const layoutRoute = routes.find((route) => route.path === '/')
    const homeRoute = layoutRoute?.children?.find((route) => route.path === '')

    expect(homeRoute?.name).toBe('home')
    expect(homeRoute?.redirect).toBeUndefined()
    expect(homeRoute?.component).toBeTypeOf('function')
    expect(homeRoute?.meta?.immersive).not.toBe(true)
  })
})
