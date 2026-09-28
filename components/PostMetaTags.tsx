import type { Post } from '@/lib/types'
import { formatFloorAreaBand } from '@/lib/post-meta'

export function PostMetaTags({ post, className = '' }: { post: Post; className?: string }) {
  const areaLabel = formatFloorAreaBand(post.floor_area_min, post.floor_area_max)
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      {post.doc_type && (
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
          {post.doc_type}
        </span>
      )}
      {post.layout && (
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
          {post.layout}
        </span>
      )}
      {post.floors && (
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
          {post.floors}
        </span>
      )}
      {areaLabel && (
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{areaLabel}</span>
      )}
      {post.maker && (
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{post.maker}</span>
      )}
    </div>
  )
}
