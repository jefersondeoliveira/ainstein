// lib/rate-limit.ts
import { db } from './db'

const ONE_HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000)

export async function checkCourseRateLimit(userId: string): Promise<{ ok: boolean }> {
  const count = await db.course.count({
    where: { userId, createdAt: { gte: ONE_HOUR_AGO() } },
  })
  return { ok: count < 5 }
}

export async function checkRetryRateLimit(courseId: string): Promise<{ ok: boolean }> {
  // For MVP: retry rate limiting is enforced in the retry route handler
  // by checking course status. This stub always returns ok.
  return { ok: true }
}
