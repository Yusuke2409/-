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
  'パントリーここにあるの強い',
  'わかる、収納こわい',
  '南向きで明るいな',
  '動線きれいでは',
  '玄関の靴箱だけ気になった',
  'うち収納足りなくて後悔した\nこの量なら安心では',
  '洗面からキッチン遠いの朝しんどいかも',
  'WICあるの羨ましい\n廊下ちょっと長いかな',
  'これ動線きれいでは\n玄関の靴箱だけ気になった',
  '子ども部屋ちょっと狭い？\nリビングは広そう',
  '家事動線ここ気になる\n朝の身支度どうする予定？',
  'パントリーここ強い\nうち収納足りなくて後悔した\nこの量なら安心では',
  '洗面の位置ちょっと気になる\nキッチン近いのは助かる\n窓の取り方いいな',
  'これいいな\n階段の位置だけ迷う\n全体は住みやすそう',
  '収納量は足りそう\n水回りまとまってるの好き\nリビング南向きなのもいい',
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

function isPoliteComment(text: string) {
  const t = String(text || '').replace(/\s+/g, '')
  if (/です|ます|ですね|と思います|でしょうか/.test(t)) return true
  if (/したら？|いいと思う|かな(?!り)|かも/.test(t)) return false
  return t.includes('。')
}

function lineCount(text: string) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length
}

function mixCommentsForFeed(comments: string[]) {
  const rest = shufflePick(comments, comments.length)
  const out: string[] = []
  while (rest.length > 0) {
    const last = out[out.length - 1]
    const prev = out[out.length - 2]
    const lastTone = last ? isPoliteComment(last) : null
    const prevTone = prev ? isPoliteComment(prev) : null
    const lastLines = last ? lineCount(last) : null
    const prevLines = prev ? lineCount(prev) : null
    let idx = rest.findIndex((item) => {
      const tone = isPoliteComment(item)
      const lines = lineCount(item)
      if (lastTone != null && prevTone === lastTone && tone === lastTone) return false
      if (lastLines != null && prevLines === lastLines && lines === lastLines) return false
      return true
    })
    if (idx < 0) idx = 0
    out.push(rest.splice(idx, 1)[0])
  }
  return out
}

function cleanComment(text: string) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\u3000]+/g, ' ').replace(/!+/g, '！').trim())
    .filter(Boolean)
    .slice(0, 3)
  if (lines.length === 0) return ''
  const compact = lines.join('')
  if (compact.length < 6) return ''
  if (compact.length <= 110) return lines.join('\n')
  const kept: string[] = []
  let used = 0
  for (const line of lines) {
    if (used >= 110) break
    const next = line.slice(0, Math.max(0, 110 - used))
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
      text: `X（旧Twitter）で間取り相談の投稿に返信する一般人のコメントを${args.count}個作って。
投稿者の説明・コメント（内容を見て、全部に答えなくてよい。1点だけ拾う）:
${args.comment || '（説明なし）'}
長さの内訳（必ずこの件数。配列内で1行・2行・3行を固めず混ぜる）:
- ${mix.threeLine}個: 改行2つで必ず3行。ツイート本文を改行した感じ。各行は短くてよい
- ${mix.twoLine}個: 改行1つで必ず2行
- ${mix.oneLine}個: 改行なし1行（だいたい10〜28字）
口調の内訳（必ずこの件数。長さと組み合わせてよい）:
- ${tone.polite}個: やわらかいですます。「いいですね」「気になります」くらい。論文調の「〜の方がいいと思います。」は禁止
- ${tone.casual}個: タイムラインの口語。「〜では」「〜かも」「うちも〜」「わかる」
条件:
- 専門家レビュー禁止。チェックリスト（動線→収納→LDK）で全部コメントしない
- 1コメントは一点だけ。共感・つぶやき・自分の家の話・質問、どれか
- 画像と説明を見て具体的な場所（洗面、パントリー、階段、窓など）に触れる
- 同じ言い回しを繰り返さない。丁寧語とため口を配列の中で織り交ぜる
- 「！」はほぼ使わない（${args.count}個のうち多くて1個）。「！！」「！？」禁止
- ため口に句点「。」は使わない
悪い例: 動線も収納もLDKも一度にレビューする
良い例1行: パントリーここにあるの強い
良い例2行:
これ動線きれいでは
玄関の靴箱だけ気になった
良い例3行:
パントリーここ強い
うち収納足りなくて後悔した
この量なら安心では
JSONだけ返す: {"comments":["一行", "二行目1\\n二行目2", "三行1\\n三行2\\n三行3"]}`,
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
      temperature: 0.95,
      max_tokens: 2000,
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
  return {
    comments: mixCommentsForFeed(limitExclamationMarks(unique)),
    aiCount: fromAi.length,
  }
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
  const fallbackOrder = mixCommentsForFeed(FALLBACK_COMMENTS)
  const rows = picked.map((account, index) => ({
    post_id: postId,
    account_email: account.email,
    nickname: account.nickname,
    content: fallbackOrder[index % fallbackOrder.length],
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
  const idByEmail = await officialAuthIdByEmail(supabase)
  let posted = 0
  for (const job of jobs || []) {
    const accountEmail = emailKey(job.account_email)
    const nickname = nickByEmail.get(accountEmail) || ''
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
        user_email: accountEmail,
        user_id: idByEmail.get(accountEmail) || null,
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
