import { describe, expect, it } from 'vitest'
import { interviewPrepRoutes } from './routes'

describe('interview review routes', () => {
  it('registers overview and question-review pages', () => {
    expect(interviewPrepRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'interviews', name: 'interview-overview' }),
        expect.objectContaining({
          path: 'interviews/:jobPostId',
          name: 'interview-question-review',
        }),
      ]),
    )
  })
})
