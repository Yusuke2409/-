import { scheduleOfficialComments } from '@/lib/official-comments'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { postId?: number }
  const postId = Number(body.postId)
  if (!Number.isFinite(postId) || postId <= 0) {
    return Response.json({ error: 'invalid_post' }, { status: 400 })
  }

  try {
    const result = await scheduleOfficialComments(postId)
    return Response.json(result)
  } catch (error: any) {
    return Response.json({ error: error?.message || 'schedule_failed' }, { status: 500 })
  }
}
