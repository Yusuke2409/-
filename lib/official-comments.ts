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

function emailKey(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

async function officialAuthIdByEmail(supabase: SupabaseClient) {
  const idByEmail = new Map<string, string>()
  try {
    for (let page = 1; page <= 3; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
      if (error) break
      for (const user of data.users || []) {
        const email = emailKey(user.email)
        if (!isOfficialEmail(email) || !user.id) continue
        idByEmail.set(email, String(user.id))
      }
      if ((data.users || []).length < 200) break
    }
  } catch (error) {
    console.error('official-comments auth lookup failed', error)
  }
  return idByEmail
}

function usersNickname(row: { nickname?: string | null } | null | undefined) {
  return String(row?.nickname || '').trim()
}

export async function officialNicknamesFromUsers(supabase: SupabaseClient) {
  const byEmail = new Map<string, string>()
  const { data: rows, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('official-comments users lookup failed', error.message)
    return byEmail
  }

  const idByEmail = await officialAuthIdByEmail(supabase)
  const emailByUserId = new Map<string, string>()
  for (const [email, userId] of idByEmail) {
    emailByUserId.set(userId, email)
  }

  for (const row of rows || []) {
    const nick = usersNickname(row)
    if (!nick) continue

    const rowEmail = emailKey(row.email)
    if (isOfficialEmail(rowEmail)) {
      byEmail.set(rowEmail, nick)
      continue
    }

    const userId = row.user_id ? String(row.user_id) : ''
    const emailFromId = userId ? emailByUserId.get(userId) : ''
    if (emailFromId) {
      byEmail.set(emailFromId, nick)
    }
  }

  return byEmail
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
  '動線がいいですね',
  '収納は充分だと思います。',
  'LDK広くていいですね',
  '洗面はもう少し右の方がいいと思います。',
  '窓の位置がいいですね',
  '家事動線よさげ\n収納多いのがいいと思う',
  'キッチン対面がいいですね\nパントリーもあると助かります。',
  'WICあるの羨ましい\n廊下ちょっと長い気がする',
  '南向きで明るくていいですね\n玄関収納はもう少し欲しいかも',
  '水回り近いのがいいと思う\nトイレ位置は変えたら？',
  '全体のバランスは良さそうです。\nLDK広めで明るいと思います。\n廊下は少し長い気がします。',
  '動線スムーズでいいと思う\n洗面もう少し右にしたら？\n収納量は充分そう',
  '玄関まわり便利そうですね\n階段位置はもう一声かもしれません。\n子ども部屋はちょうどいいです。',
  'お風呂広めがいいと思う\n家事動線もきれい\nリビングの向き気になる',
  '間取りわかりやすいです。\nキッチン使いやすそうですね\n窓の取り方がいいと思います。',
]

function commentLengthMix(count: number) {
  const threeLine = Math.round(count * 0.5)
  const remaining = Math.max(0, count - threeLine)
  const oneLine = Math.round(remaining * 0.5)
  const twoLine = remaining - oneLine
  return { oneLine, twoLine, threeLine }
}

function commentToneMix(count: number) {
  const polite = Math.round(count * 0.5)
  const casual = Math.max(0, count - polite)
  return { polite, casual }
}

function cleanComment(text: string) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\u3000]+/g, '').replace(/!+/g, '！').trim())
    .filter(Boolean)
    .slice(0, 3)
  if (lines.length === 0) return ''
  const compact = lines.join('')
  if (compact.length < 8) return ''
  if (compact.length <= 90) return lines.join('\n')
  const kept: string[] = []
  let used = 0
  for (const line of lines) {
    if (used >= 90) break
    const next = line.slice(0, Math.max(0, 90 - used))
    if (next) kept.push(next)
    used += next.length
  }
  return kept.join('\n')
}

function limitExclamationMarks(comments: string[]) {
  let kept = false
  return comments.map((item) => {
    if (!item.includes('！')) return item
    if (!kept && Math.random() < 0.12) {
      kept = true
      return item.replace(/！{2,}/g, '！')
    }
    return item.replace(/！+/g, '')
  })
}

async function generateWithOpenAI(args: {
  count: number
  comment: string
  imageUrl?: string
}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return [] as string[]

  const mix = commentLengthMix(args.count)
  const tone = commentToneMix(args.count)
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `間取り投稿への感想を${args.count}個作って。
投稿者の説明・コメント（必ず内容を踏まえる）:
${args.comment || '（説明なし）'}
長さの内訳（必ずこの件数）:
- ${mix.threeLine}個: 改行で3行。各行は短い一言
- ${mix.twoLine}個: 改行で2行
- ${mix.oneLine}個: 改行なし1行の簡単な一言（8〜22字）
口調の内訳（必ずこの件数。長さと組み合わせてよい）:
- ${tone.polite}個: 丁寧語。「〜の方がいいと思います。」「〜がいいですね」
- ${tone.casual}個: ため口。「〜したら？」「〜がいいと思う」
条件:
- 1行はだいたい8〜22字。3行でも長くしすぎない
- 画像と投稿者の説明の両方を見て書く。説明に書いてある悩みや希望には、いくつか返事する
- 良い点か、軽い改善案
- 同じ内容を繰り返さない。配列の順番は丁寧語とため口、1行・2行・3行を混ぜる
- 専門家っぽい堅い言い方は禁止（論文調・命令調はNG）
- 丁寧語はですます調でやわらかく。ため口は友達に話す感じ
- 「！」はほぼ使わない（${args.count}個のうち多くて1個）
- 「！！」「！？」は禁止
- 丁寧語だけ句点「。」を使ってよい。ため口は「。」なし
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
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  })
  if (!res.ok) {
    console.error('official-comments openai failed', res.status)
    return []
  }
  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed?.comments) ? parsed.comments : []
    return limitExclamationMarks(
      list.map((item: unknown) => cleanComment(String(item))).filter(Boolean),
    )
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
  return { comments: limitExclamationMarks(unique), aiCount: fromAi.length }
}

export async function loadOfficialAccounts(supabase: SupabaseClient) {
  const nickByEmail = await officialNicknamesFromUsers(supabase)
  return officialEmailList()
    .map((email) => ({
      email,
      nickname: nickByEmail.get(emailKey(email)) || '',
    }))
    .filter((account) => account.nickname)
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

  const nickByEmail = await officialNicknamesFromUsers(supabase)
  const namedAccounts = officialEmailList().flatMap((email) => {
    const nickname = nickByEmail.get(emailKey(email)) || ''
    return nickname ? [{ email, nickname }] : []
  })
  if (namedAccounts.length === 0) {
    return { ok: false, skipped: 'no_public_users_nickname' as const }
  }
  const pickCount = Math.min(namedAccounts.length, randInt(10, 20))
  const picked = shufflePick(namedAccounts, pickCount)
  const images: string[] = Array.isArray(post.image_urls)
    ? post.image_urls
    : post.image_url
      ? [post.image_url]
      : []
  const runAts = staggerRunTimes(picked.length)
  const rows = picked.map((account, index) => ({
    post_id: postId,
    account_email: account.email,
    nickname: account.nickname,
    content: FALLBACK_COMMENTS[index % FALLBACK_COMMENTS.length],
    run_at: runAts[index].toISOString(),
    status: 'pending',
  }))

  const { data: insertedJobs, error: insertError } = await supabase
    .from('official_comment_jobs')
    .insert(rows)
    .select('id')
  if (insertError) {
    return { ok: false, skipped: 'jobs_table' as const, error: insertError.message }
  }

  let aiCount = 0
  try {
    const generated = await makeOfficialComments({
      count: picked.length,
      comment: stripPostMeta(String(post.comment || '')),
      imageUrl: images[0],
    })
    aiCount = generated.aiCount
    const jobs = insertedJobs || []
    for (let i = 0; i < jobs.length; i++) {
      const content = generated.comments[i]
      if (!content || !jobs[i]?.id) continue
      await supabase.from('official_comment_jobs').update({ content }).eq('id', jobs[i].id)
    }
  } catch (error) {
    console.error('official-comments openai skipped after schedule', error)
  }

  const result = {
    ok: true as const,
    scheduled: rows.length,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    aiCount,
  }
  console.log('official-comments scheduled', result)
  return result
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

  const nickByEmail = await officialNicknamesFromUsers(supabase)
  let posted = 0
  for (const job of jobs || []) {
    const nickname = nickByEmail.get(emailKey(job.account_email)) || ''
    if (!nickname) {
      await supabase
        .from('official_comment_jobs')
        .update({ status: 'error', error: 'public.users の nickname がありません' })
        .eq('id', job.id)
      continue
    }
    if (nickname !== job.nickname) {
      await supabase.from('official_comment_jobs').update({ nickname }).eq('id', job.id)
    }
    const { error: commentError } = await supabase.from('comments').insert([
      {
        post_id: job.post_id,
        nickname,
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
