import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'

type WebhookBody = {
  type?: string
  table?: string
  record?: Record<string, unknown>
  title?: string
  body?: string
  url?: string
  user_id?: string
  nickname?: string
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

function setupVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:madocomi.official@gmail.com'
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured')
  return createClient(url, key)
}

async function sendToSubscriptions(
  rows: { endpoint: string; p256dh: string; auth: string }[],
  payload: { title: string; body: string; url: string }
) {
  const message = JSON.stringify(payload)
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          message
        )
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          const supabase = adminClient()
          await supabase.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
        }
      }
    })
  )
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const header = request.headers.get('authorization') || request.headers.get('x-push-secret') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!secret || token !== secret) {
    return json({ error: 'unauthorized' }, 401)
  }

  try {
    setupVapid()
  } catch (error: any) {
    return json({ error: error.message }, 500)
  }

  const body = (await request.json().catch(() => ({}))) as WebhookBody
  const supabase = adminClient()

  let title = body.title || 'マドコミ'
  let text = body.body || '新しいお知らせがあります'
  let url = body.url || '/'
  let targetUserId = typeof body.user_id === 'string' ? body.user_id : ''
  let targetNickname = typeof body.nickname === 'string' ? body.nickname : ''

  if (body.table === 'comments' && body.record) {
    const postId = Number(body.record.post_id)
    const commenter = String(body.record.nickname || 'どなたか')
    text = `${commenter} さんから、投稿にコメントがありました`
    url = '/'
    if (Number.isFinite(postId)) {
      const { data: post } = await supabase
        .from('posts')
        .select('user_id, nickname')
        .eq('id', postId)
        .maybeSingle()
      if (post?.nickname && post.nickname === commenter) {
        return json({ ok: true, skipped: 'self' })
      }
      targetUserId = post?.user_id || targetUserId
      targetNickname = post?.nickname || targetNickname
    }
  }

  if (body.table === 'messages' && body.record) {
    const sender = String(body.record.sender_nickname || 'どなたか')
    const recipient = String(body.record.recipient_nickname || '')
    if (sender && recipient && sender === recipient) {
      return json({ ok: true, skipped: 'self' })
    }
    text = `${sender} さんからメッセージが届きました`
    url = '/'
    targetNickname = recipient || targetNickname
  }

  if (!targetUserId && !targetNickname) {
    return json({ ok: true, skipped: 'no-target' })
  }

  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
  if (targetUserId) query = query.eq('user_id', targetUserId)
  else query = query.eq('nickname', targetNickname)

  const { data: subs, error } = await query
  if (error) return json({ error: error.message }, 500)
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0 })

  await sendToSubscriptions(subs, { title, body: text, url })
  return json({ ok: true, sent: subs.length })
}
