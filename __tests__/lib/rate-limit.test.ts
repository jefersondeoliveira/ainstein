// __tests__/lib/rate-limit.test.ts
import { checkCourseRateLimit, checkRetryRateLimit } from '@/lib/rate-limit'

jest.mock('@/lib/db', () => ({
  db: {
    course: { count: jest.fn() },
  },
}))

import { db } from '@/lib/db'

describe('checkCourseRateLimit', () => {
  it('returns ok when under limit', async () => {
    (db.course.count as jest.Mock).mockResolvedValue(3)
    const result = await checkCourseRateLimit('user1')
    expect(result.ok).toBe(true)
  })

  it('returns not ok when at limit', async () => {
    (db.course.count as jest.Mock).mockResolvedValue(5)
    const result = await checkCourseRateLimit('user1')
    expect(result.ok).toBe(false)
  })
})
