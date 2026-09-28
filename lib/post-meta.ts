export type PostAreaMeta = { maker?: string; min?: number | null; max?: number | null }

export function formatFloorAreaBand(min?: number | string | null, max?: number | string | null) {
  const minN = min == null || min === '' ? null : Number(min)
  const maxN = max == null || max === '' ? null : Number(max)
  const hasMin = minN != null && Number.isFinite(minN)
  const hasMax = maxN != null && Number.isFinite(maxN)
  if (!hasMin && !hasMax) return null
  if ((minN == null || minN === 0) && maxN === 60) return '60㎡以下'
  if (minN === 200 && (maxN == null || maxN === 0)) return '200㎡以上'
  if (minN != null && maxN === minN + 10 && minN >= 60 && minN <= 190) return `${minN}㎡台`
  if (!hasMin && !hasMax) return null
  const left = hasMin && minN > 0 ? `${minN}㎡以上` : '下限なし'
  const right = hasMax && maxN > 0 ? `${maxN}㎡未満` : '上限なし'
  return `${left}〜${right}`
}

export function stripPostMetaComment(comment: string) {
  return (comment || '').replace(/\n?\[\[mc:[\s\S]*\]\]\s*$/, '').trim()
}

export function encodePostMetaComment(comment: string, meta: PostAreaMeta) {
  return `${stripPostMetaComment(comment)}\n[[mc:${JSON.stringify(meta)}]]`
}

export function parsePostMetaComment(comment: string): PostAreaMeta {
  const match = (comment || '').match(/\[\[mc:([\s\S]*)\]\]\s*$/)
  if (!match) return {}
  try {
    const data = JSON.parse(match[1])
    return {
      maker: typeof data.maker === 'string' ? data.maker : undefined,
      min: data.min ?? null,
      max: data.max ?? null,
    }
  } catch {
    return {}
  }
}

export function withPostMeta(post: {
  comment?: string
  maker?: string | null
  floor_area_min?: number | string | null
  floor_area_max?: number | string | null
}) {
  const meta = parsePostMetaComment(post.comment || '')
  const minFromCol = post.floor_area_min != null && post.floor_area_min !== '' ? Number(post.floor_area_min) : null
  const maxFromCol = post.floor_area_max != null && post.floor_area_max !== '' ? Number(post.floor_area_max) : null
  return {
    comment: stripPostMetaComment(post.comment || ''),
    maker: post.maker || meta.maker || '',
    floor_area_min: minFromCol != null && Number.isFinite(minFromCol) ? minFromCol : meta.min ?? null,
    floor_area_max: maxFromCol != null && Number.isFinite(maxFromCol) ? maxFromCol : meta.max ?? null,
  }
}
