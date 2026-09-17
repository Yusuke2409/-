import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const OFFICIAL_EMAIL_PREFIX = 'kane76123@gmail.com'
export const OFFICIAL_EMAIL_START = 21
export const OFFICIAL_EMAIL_END = 250

export function officialEmailList() {
  const list: string[] = []
  for (let i = OFFICIAL_EMAIL_START; i <= OFFICIAL_EMAIL_END; i++) {
    list.push(`${OFFICIAL_EMAIL_PREFIX}${i}`)
  }
  return list
}

export function officialEmailNumber(email: string) {
  const match = email.trim().toLowerCase().match(/^kane76123@gmail\.com(\d+)$/)
  if (!match) return null
  const n = Number(match[1])
  if (n < OFFICIAL_EMAIL_START || n > OFFICIAL_EMAIL_END) return null
  return n
}

export function isOfficialEmail(email?: string | null) {
  return !!email && officialEmailNumber(email) != null
}

export function nicknameFromOfficialEmail(email: string) {
  const n = officialEmailNumber(email)
  return n != null ? `【公式】${n}` : '【公式】'
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export function shufflePick<T>(items: T[], count: number) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy.slice(0, Math.max(0, Math.min(count, copy.length)))
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function staggerRunTimes(count: number) {
  const firstDelaySec = randInt(60, 300)
  const times: Date[] = []
  let cursor = Date.now() + firstDelaySec * 1000
  for (let i = 0; i < count; i++) {
    times.push(new Date(cursor))
    if (i < count - 1) {
      cursor += randInt(2 * 60, 40 * 60) * 1000
    }
  }
  return times
}

function stripPostMeta(comment: string) {
  return (comment || '').replace(/\n?\[\[mc:[\s\S]*\]\]\s*$/, '').trim()
}

const FALLBACK_COMMENTS = [
  '収納多くて使いやすそう！',
  '動線きれいですね',
  '洗面の位置もう少し右が良さげ',
  'LDK広くていい感じ',
  '玄関まわり便利そう',
  '水回り近いの助かる',
  '窓の位置いいカモ',
  '廊下ちょっと長めかな',
  'キッチン対面で良さそう',
  '家事動線よさげ！',
  'トイレ位置ちょっと気になる',
  'WICあるの羨ましい',
  '動線スムーズで良い',
  '階段位置もう一声かも',
  '南向きっぽくて明るい',
  '玄関収納もう少し欲しい',
  'お風呂広めで良さそう',
  '子ども部屋ちょうどいい',
  'パントリーあるの良いね',
  'リビング動線ちょっと気になる',
]

function cleanComment(text: string) {
  const value = (text || '').replace(/\s+/g, '').trim()
  if (value.length < 8) return ''
  if (value.length > 22) return value.slice(0, 20)
  return value
}

async function generateWithOpenAI(args: {
  count: number
  comment: string
  imageUrl?: string
}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return [] as string[]

  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `間取り投稿への短い感想を${args.count}個作って。
投稿説明: ${args.comment || '（説明なし）'}
条件:
- 日本語、ラフな口調（友達に話す感じ）
- 1つあたり10〜20文字
- 良い点か「ここはこうしたらもっと良さそう」の軽い指摘
- 同じ内容を繰り返さない
- 専門家っぽい堅い言い方は禁止
JSONだけ返す: {"comments":["...", "..."]}`,
    },
  ]
  if (args.imageUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: args.imageUrl },
    })
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  })
  if (!res.ok) return []
  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed?.comments) ? parsed.comments : []
    return list.map((item: unknown) => cleanComment(String(item))).filter(Boolean)
  } catch {
    return []
  }
}

export async function makeOfficialComments(args: {
  count: number
  comment: string
  imageUrl?: string
}) {
  const wanted = args.count
  const fromAi = await generateWithOpenAI(args)
  const unique: string[] = []
  for (const item of [...fromAi, ...shufflePick(FALLBACK_COMMENTS, FALLBACK_COMMENTS.length)]) {
    if (!item || unique.includes(item)) continue
    unique.push(item)
    if (unique.length >= wanted) break
  }
  return unique
}

export async function loadOfficialAccounts(supabase: SupabaseClient) {
  const allowed = new Set(officialEmailList().map((e) => e.toLowerCase()))
  const found: { email: string; nickname: string }[] = []
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const users = data.users || []
    for (const user of users) {
      const email = user.email?.toLowerCase()
      if (!email || !allowed.has(email)) continue
      found.push({
        email: user.email as string,
        nickname:
          (user.user_metadata?.nickname as string | undefined)?.trim() ||
          nicknameFromOfficialEmail(user.email as string),
      })
    }
    if (users.length < 200) break
  }
  return found
}

export async function scheduleOfficialComments(postId: number) {
  const supabase = adminClient()
  if (!supabase) {
    return { ok: false, skipped: 'missing_service_role' as const }
  }

  const { data: post, error: postError } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle()
  if (postError || !post) {
    return { ok: false, skipped: 'post_not_found' as const }
  }

  const posterEmail = String(post.user_email || '')
  if (isOfficialEmail(posterEmail)) {
    return { ok: false, skipped: 'official_author' as const }
  }

  const { count } = await supabase
    .from('official_comment_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)
  if ((count || 0) > 0) {
    return { ok: true, skipped: 'already_scheduled' as const }
  }

  const accounts = await loadOfficialAccounts(supabase)
  if (accounts.length === 0) {
    return { ok: false, skipped: 'no_official_accounts' as const }
  }

  const pickCount = Math.min(accounts.length, randInt(10, 20))
  const picked = shufflePick(accounts, pickCount)
  const images: string[] = Array.isArray(post.image_urls)
    ? post.image_urls
    : post.image_url
      ? [post.image_url]
      : []
  const comments = await makeOfficialComments({
    count: picked.length,
    comment: stripPostMeta(String(post.comment || '')),
    imageUrl: images[0],
  })
  const runAts = staggerRunTimes(picked.length)

  const rows = picked.map((account, index) => ({
    post_id: postId,
    account_email: account.email,
    nickname: account.nickname,
    content: comments[index] || FALLBACK_COMMENTS[index % FALLBACK_COMMENTS.length],
    run_at: runAts[index].toISOString(),
    status: 'pending',
  }))

  const { error: insertError } = await supabase.from('official_comment_jobs').insert(rows)
  if (insertError) {
    return { ok: false, skipped: 'jobs_table' as const, error: insertError.message }
  }

  return { ok: true, scheduled: rows.length }
}

export async function postDueOfficialComments() {
  const supabase = adminClient()
  if (!supabase) {
    return { ok: false, skipped: 'missing_service_role' as const }
  }

  const { data: jobs, error } = await supabase
    .from('official_comment_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .order('run_at', { ascending: true })
    .limit(20)

  if (error) {
    return { ok: false, skipped: 'jobs_table' as const, error: error.message }
  }

  const { count: waitingCount } = await supabase
    .from('official_comment_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .gt('run_at', new Date().toISOString())

  let posted = 0
  for (const job of jobs || []) {
    const { error: commentError } = await supabase.from('comments').insert([
      {
        post_id: job.post_id,
        nickname: job.nickname,
        content: job.content,
        avatar_url: '',
        bio: '',
      },
    ])
    if (commentError) {
      await supabase
        .from('official_comment_jobs')
        .update({ status: 'error', error: commentError.message })
        .eq('id', job.id)
      continue
    }
    await supabase
      .from('official_comment_jobs')
      .update({ status: 'posted', posted_at: new Date().toISOString(), error: null })
      .eq('id', job.id)
    posted += 1
  }

  return { ok: true, posted, dueNow: (jobs || []).length, waiting: waitingCount || 0 }
}
