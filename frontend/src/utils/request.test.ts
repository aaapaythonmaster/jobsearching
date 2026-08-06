import { afterEach, describe, expect, it, vi } from 'vitest'

describe('request API base URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('uses /api by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: {}, message: 'ok' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { request } = await import('./request')

    await request('/health')

    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.any(Object))
  })

  it('uses and normalizes VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://jobsearching-api-aaapaythonmaster.onrender.com/api/')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: {}, message: 'ok' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { request } = await import('./request')

    await request('/jobs')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://jobsearching-api-aaapaythonmaster.onrender.com/api/jobs',
      expect.any(Object),
    )
  })
})
