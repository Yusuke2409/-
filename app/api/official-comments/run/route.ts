import { postDueOfficialComments } from '@/lib/official-comments'

export const runtime = 'nodejs'
export const maxDuration = 60

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.PUSH_WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  const query = new URL(request.url).searchParams.get('secret')
  return token === secret || query === secret
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json(
      {
        error: 'unauthorized',
        message:
          'secret が違います。.env.local の CRON_SECRET の値を、URLの secret= のあとにそのまま入れてください。',
      },
      { status: 401 }
    )
  }
  try {
    const result = await postDueOfficialComments()
    return Response.json(result)
  } catch (error: any) {
    return Response.json({ error: error?.message || 'run_failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}
