import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { jobSearchRoutes } from './job-search.routes'

/**
 * The module's only public surface. Mounts the module's routes under a
 * stable URL prefix. Register from `src/routes.ts`.
 */
export default fp(
  async (app) => {
    await app.register(multipart, {
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    })
    await app.register(jobSearchRoutes, { prefix: '/api/job-search' })
  },
  { name: 'module-job-search' },
)

export type { Resume } from './job-search.types'
export { ResumeSchema, ResumeUploadMetadataSchema } from './job-search.schema'
