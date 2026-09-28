'use client'

import { useRef, useState } from 'react'

export function moveItem<T>(list: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function ImagePreviewReorder({
  urls,
  onReorder,
  onOpen,
  altPrefix = 'プレビュー',
}: {
  urls: string[]
  onReorder: (from: number, to: number) => void
  onOpen?: (index: number) => void
  altPrefix?: string
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const dragIndexRef = useRef<number | null>(null)
  const startPosRef = useRef({ x: 0, y: 0 })
  const movedRef = useRef(false)
  const reorderReadyRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const longPressRef = useRef<number | null>(null)
  const targetRef = useRef<HTMLButtonElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (urls.length === 0) return null

  const clearLongPress = () => {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }

  const indexFromClientX = (x: number) => {
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const dist = Math.abs(x - cx)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    return best
  }

  const scrollStrip = (clientX: number) => {
    const strip = stripRef.current
    if (!strip) return
    const rect = strip.getBoundingClientRect()
    const edge = 48
    if (clientX < rect.left + edge) strip.scrollLeft -= 16
    else if (clientX > rect.right - edge) strip.scrollLeft += 16
  }

  const beginReorder = (index: number) => {
    reorderReadyRef.current = true
    dragIndexRef.current = index
    setActiveIndex(index)
    if (targetRef.current && pointerIdRef.current != null) {
      try {
        targetRef.current.setPointerCapture(pointerIdRef.current)
      } catch {
        /* already released */
      }
    }
  }

  const onPointerDown = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    pointerIdRef.current = e.pointerId
    targetRef.current = e.currentTarget
    dragIndexRef.current = index
    startPosRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    reorderReadyRef.current = false
    clearLongPress()

    if (urls.length > 1) {
      const strip = stripRef.current
      const overflow = !!strip && strip.scrollWidth > strip.clientWidth + 8
      if (e.pointerType === 'mouse' || !overflow) {
        beginReorder(index)
      } else {
        longPressRef.current = window.setTimeout(() => beginReorder(index), 220)
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragIndexRef.current == null) return
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    const dist = Math.hypot(dx, dy)

    if (!reorderReadyRef.current) {
      if (dist > 10) clearLongPress()
      return
    }

    if (dist > 8) movedRef.current = true
    if (!movedRef.current) return
    e.preventDefault()
    scrollStrip(e.clientX)
    const from = dragIndexRef.current
    const to = indexFromClientX(e.clientX)
    if (to === from) return
    onReorder(from, to)
    dragIndexRef.current = to
    setActiveIndex(to)
  }

  const endDrag = (index: number) => {
    clearLongPress()
    const wasMoved = movedRef.current
    const current = dragIndexRef.current ?? index
    dragIndexRef.current = null
    movedRef.current = false
    reorderReadyRef.current = false
    pointerIdRef.current = null
    targetRef.current = null
    setActiveIndex(null)
    if (!wasMoved) onOpen?.(current)
  }

  return (
    <div className="space-y-1">
      {urls.length > 1 && (
        <p className="text-[11px] text-slate-400">
          ドラッグまたはスワイプで順番を変更できます（左が1枚目）
        </p>
      )}
      <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2">
        {urls.map((url, idx) => (
          <button
            key={url}
            type="button"
            ref={(el) => {
              itemRefs.current[idx] = el
            }}
            onPointerDown={(e) => onPointerDown(idx, e)}
            onPointerMove={onPointerMove}
            onPointerUp={() => endDrag(idx)}
            onPointerCancel={() => endDrag(idx)}
            className={`relative shrink-0 select-none ${
              urls.length > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
            } ${activeIndex === idx ? 'z-10 scale-105' : ''}`}
            title={urls.length > 1 ? 'ドラッグで順番を変更 / タップで拡大' : '拡大表示'}
          >
            <img
              src={url}
              alt={`${altPrefix} ${idx + 1}`}
              draggable={false}
              className={`w-20 h-20 object-cover rounded-lg border pointer-events-none ${
                activeIndex === idx ? 'border-indigo-500 shadow-md' : 'border-slate-200'
              }`}
            />
            <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-black/65 text-white text-[10px] font-bold leading-[18px] text-center">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
