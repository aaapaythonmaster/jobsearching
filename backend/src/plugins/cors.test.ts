import assert from 'node:assert/strict'
import { test } from 'node:test'
import Fastify from 'fastify'

process.env.CORS_ORIGIN = 'https://jobsearching.vercel.app'

test('only allows the configured production frontend origin', async () => {
  const { default: corsPlugin } = await import('./cors')
  const app = Fastify()
  await app.register(corsPlugin)
  app.get('/probe', async () => ({ ok: true }))

  const allowed = await app.inject({
    method: 'GET',
    url: '/probe',
    headers: { origin: 'https://jobsearching.vercel.app' },
  })
  assert.equal(allowed.headers['access-control-allow-origin'], 'https://jobsearching.vercel.app')

  const rejected = await app.inject({
    method: 'GET',
    url: '/probe',
    headers: { origin: 'https://untrusted.example' },
  })
  assert.equal(rejected.headers['access-control-allow-origin'], 'https://jobsearching.vercel.app')
  assert.notEqual(rejected.headers['access-control-allow-origin'], 'https://untrusted.example')

  await app.close()
})
