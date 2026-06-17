import fp from 'fastify-plugin'
import jobSearchModule from './modules/job-search'
import todoModule from './modules/todo'

/**
 * Aggregates every business module's plugin. To add a new module, register
 * its default-exported plugin here. The module decides its own URL prefix.
 */
export default fp(
  async (app) => {
    await app.register(todoModule)
    await app.register(jobSearchModule)
  },
  { name: 'app-routes' },
)
