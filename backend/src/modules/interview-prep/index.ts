import fp from 'fastify-plugin'
import { interviewPrepRoutes } from './interview-prep.routes'

export default fp(
  async (app) => {
    await app.register(interviewPrepRoutes, { prefix: '/api/interview-prep' })
  },
  { name: 'module-interview-prep' },
)

export type { InterviewPrep } from './interview-prep.types'
export { InterviewPrepSchema } from './interview-prep.schema'
