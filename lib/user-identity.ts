import { supabase } from '@/lib/supabase'

export function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

export function isSameEmail(a?: string | null, b?: string | null) {
  const left = normalizeEmail(a)
  const right = normalizeEmail(b)
  return !!left && left === right
}

export type AccountRef = {
  id?: string
  email?: string | null
}

export type OwnedRow = {
  user_id?: string | null
  user_email?: string | null
  nickname?: string | null
}

export function isOwnedByAccount(
  row: OwnedRow,
  user?: AccountRef | null,
  nick?: string,
  aliasNicks: string[] = []
) {
  if (!user) return false
  if (row.user_id && user.id && String(row.user_id) === String(user.id)) return true
  if (isSameEmail(row.user_email, user.email)) return true
  if (row.user_id && user.id && String(row.user_id) !== String(user.id)) return false
  if (row.user_email && String(row.user_email).trim() && user.email && !isSameEmail(row.user_email, user.email)) {
    return false
  }
  const aliases = uniqueNicks([nick, ...aliasNicks])
  return !!(row.nickname && aliases.includes(row.nickname))
}

export function profileFromUsers(
  users: any[] | null | undefined,
  keys: { email?: string | null; userId?: string | null; nickname?: string | null }
) {
  const list = users || []
  if (keys.email) {
    const byEmail = list.find((u) => isSameEmail(u.email, keys.email))
    if (byEmail) return byEmail
  }
  if (keys.userId) {
    const byId = list.find((u) => u.user_id && String(u.user_id) === String(keys.userId))
    if (byId) return byId
  }
  if (keys.nickname) {
    return list.find((u) => u.nickname === keys.nickname) || null
  }
  return null
}

function missingColumnFromError(message: string) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column "([^"]+)" of relation/i)
  return match?.[1] ?? null
}

function uniqueNicks(values: (string | null | undefined)[]) {
  const seen = new Set<string>()
  const list: string[] = []
  for (const value of values) {
    const nick = (value || '').trim()
    if (!nick || seen.has(nick)) continue
    seen.add(nick)
    list.push(nick)
  }
  return list
}

async function updateUsersBy(column: string, value: string, payload: Record<string, unknown>) {
  let current = { ...payload }
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase.from('users').update(current).eq(column, value).select('*')
    if (!error) return data?.[0] ?? null
    const missing = missingColumnFromError(error.message || '')
    if (missing && missing in current) {
      delete current[missing]
      continue
    }
    if ((error.message || '').includes(column) || error.code === '42703') return null
    throw error
  }
  return null
}

export async function savePublicUserRow(
  authUser: { id: string; email?: string | null },
  fields: { nickname: string; avatar_url: string; bio: string; user_urls: string[] },
  previousNickname?: string
) {
  const email = authUser.email?.trim() || null
  const payload: Record<string, unknown> = {
    ...fields,
    email,
    user_id: authUser.id,
    updated_at: new Date().toISOString(),
  }

  if (previousNickname) {
    const byPrevious = await updateUsersBy('nickname', previousNickname, payload)
    if (byPrevious) return byPrevious
  }

  if (email) {
    const byEmail = await updateUsersBy('email', email, payload)
    if (byEmail) return byEmail
  }

  const byUserId = await updateUsersBy('user_id', authUser.id, payload)
  if (byUserId) return byUserId

  for (const nick of uniqueNicks([previousNickname, fields.nickname])) {
    const byNick = await updateUsersBy('nickname', nick, payload)
    if (byNick) return byNick
  }

  let current = { ...payload }
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase.from('users').insert([current]).select('*')
    if (!error) return data?.[0] ?? null
    const missing = missingColumnFromError(error.message || '')
    if (missing && missing in current) {
      delete current[missing]
      continue
    }
    if (error.code === '23505' && fields.nickname) {
      const { data: taken } = await supabase.from('users').select('*').eq('nickname', fields.nickname).maybeSingle()
      if (
        taken &&
        ((!taken.email && !taken.user_id) ||
          isSameEmail(taken.email, email) ||
          (taken.user_id && String(taken.user_id) === String(authUser.id)))
      ) {
        const claimed = await updateUsersBy('nickname', fields.nickname, payload)
        if (claimed) return claimed
      }
      throw new Error('そのニックネームは別のアカウントで使われています')
    }
    throw error
  }
  throw new Error('プロフィールの保存に失敗しました')
}

export async function attachAccountToUserRow(
  authUser: { id: string; email?: string | null },
  row: { nickname?: string | null; email?: string | null; user_id?: string | null }
) {
  if (!row?.nickname) return
  if (row.email && row.user_id) return
  const patch: Record<string, unknown> = { user_id: authUser.id }
  if (authUser.email) patch.email = authUser.email.trim()
  await supabase.from('users').update(patch).eq('nickname', row.nickname)
}

async function updateRowById(table: string, id: number, payload: Record<string, unknown>) {
  let current = { ...payload }
  for (let i = 0; i < 10; i++) {
    const { error } = await supabase.from(table).update(current).eq('id', id)
    if (!error) return
    const missing = missingColumnFromError(error.message || '')
    if (missing && missing in current) {
      delete current[missing]
      continue
    }
    return
  }
}

function isBindableRow(row: OwnedRow, authUser: { id: string; email?: string | null }, fromNicks: string[]) {
  if (row.user_id && String(row.user_id) === String(authUser.id)) return true
  if (isSameEmail(row.user_email, authUser.email)) return true
  if (row.user_id && String(row.user_id) !== String(authUser.id)) return false
  if (row.user_email && !isSameEmail(row.user_email, authUser.email)) return false
  return !!(row.nickname && fromNicks.includes(row.nickname))
}

export async function bindContentToAccount(
  authUser: { id: string; email?: string | null },
  fromNicks: string[],
  toNick?: string
) {
  const email = authUser.email?.trim() || null
  const nicks = uniqueNicks(fromNicks)
  if (!email && nicks.length === 0) return

  const patch: Record<string, unknown> = {
    user_id: authUser.id,
    user_email: email,
  }
  if (toNick?.trim()) patch.nickname = toNick.trim()

  const { data: posts } = await supabase.from('posts').select('*')
  for (const post of posts || []) {
    if (!isBindableRow(post, authUser, nicks)) continue
    await updateRowById('posts', post.id, patch)
  }

  const { data: quals } = await supabase.from('user_qualifications').select('*')
  for (const qual of quals || []) {
    if (!isBindableRow(qual, authUser, nicks)) continue
    await updateRowById('user_qualifications', qual.id, patch)
  }
}

export async function claimOwnedContent(
  authUser: { id: string; email?: string | null },
  nicknames?: string | string[]
) {
  const nicks = uniqueNicks(Array.isArray(nicknames) ? nicknames : [nicknames])
  await bindContentToAccount(authUser, nicks)
}
