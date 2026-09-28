'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
}) {
  const MIN_SCALE = 1
  const MAX_SCALE = 6
  const [index, setIndex] = useState(startIndex)
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const posRef = useRef({ x: 0, y: 0 })
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef(0)
  const movedRef = useRef(false)

  const applyTransform = (scale: number, x: number, y: number) => {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
    const nextX = nextScale === MIN_SCALE ? 0 : x
    const nextY = nextScale === MIN_SCALE ? 0 : y
    scaleRef.current = nextScale
    posRef.current = { x: nextX, y: nextY }
    setTransform({ scale: nextScale, x: nextX, y: nextY })
  }

  const resetZoom = () => applyTransform(1, 0, 0)

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const scale = scaleRef.current
    const { x, y } = posRef.current
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor))
    const cx = clientX - rect.left - rect.width / 2
    const cy = clientY - rect.top - rect.height / 2
    const wx = (cx - x) / scale
    const wy = (cy - y) / scale
    applyTransform(newScale, cx - wx * newScale, cy - wy * newScale)
  }

  useEffect(() => {
    setIndex(Math.min(Math.max(startIndex, 0), images.length - 1))
    resetZoom()
  }, [startIndex, images])

  useEffect(() => {
    resetZoom()
  }, [index])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (scaleRef.current > 1.02) return
      if (e.key === 'ArrowRight' && images.length > 1) setIndex((i) => (i + 1) % images.length)
      if (e.key === 'ArrowLeft' && images.length > 1) setIndex((i) => (i - 1 + images.length) % images.length)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.9)
    }
    const stage = stageRef.current
    window.addEventListener('keydown', onKey)
    stage?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      stage?.removeEventListener('wheel', onWheel)
    }
  }, [images.length, onClose])

  const go = (dir: number) => {
    if (images.length < 2) return
    setIndex((i) => (i + dir + images.length) % images.length)
  }

  const pointerDistance = () => {
    const pts = [...pointersRef.current.values()]
    if (pts.length < 2) return 0
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
  }

  const pointerMid = () => {
    const pts = [...pointersRef.current.values()]
    if (pts.length < 2) return { x: 0, y: 0 }
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    movedRef.current = false
    if (pointersRef.current.size === 2) {
      pinchRef.current = { dist: pointerDistance() }
      dragRef.current = null
      swipeRef.current = null
      return
    }
    if (scaleRef.current > 1.02) {
      dragRef.current = { x: posRef.current.x, y: posRef.current.y, px: e.clientX, py: e.clientY }
      swipeRef.current = null
    } else {
      swipeRef.current = { x: e.clientX, y: e.clientY }
      dragRef.current = null
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const dist = pointerDistance()
      if (dist > 0 && pinchRef.current.dist > 0) {
        movedRef.current = true
        const mid = pointerMid()
        zoomAt(mid.x, mid.y, dist / pinchRef.current.dist)
        pinchRef.current = { dist }
      }
      return
    }
    if (dragRef.current && scaleRef.current > 1.02) {
      const dx = e.clientX - dragRef.current.px
      const dy = e.clientY - dragRef.current.py
      if (Math.hypot(dx, dy) > 4) movedRef.current = true
      applyTransform(scaleRef.current, dragRef.current.x + dx, dragRef.current.y + dy)
      return
    }
    if (swipeRef.current && Math.abs(e.clientX - swipeRef.current.x) > 8) movedRef.current = true
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      pointersRef.current.delete(e.pointerId)
      pinchRef.current = null
      dragRef.current = null
      swipeRef.current = null
      return
    }

    const wasPinch = pointersRef.current.size >= 2
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 1 && scaleRef.current > 1.02) {
      const remaining = [...pointersRef.current.values()][0]
      dragRef.current = { x: posRef.current.x, y: posRef.current.y, px: remaining.x, py: remaining.y }
    } else if (pointersRef.current.size === 0) {
      dragRef.current = null
    }

    if (wasPinch) {
      if (scaleRef.current < 1.08) resetZoom()
      swipeRef.current = null
      return
    }

    if (swipeRef.current && scaleRef.current <= 1.02 && pointersRef.current.size === 0) {
      const dx = e.clientX - swipeRef.current.x
      const dy = e.clientY - swipeRef.current.y
      swipeRef.current = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1)
        return
      }
    } else {
      swipeRef.current = null
    }

    if (pointersRef.current.size > 0 || movedRef.current) return

    const onImage = !!target.closest('[data-lightbox-image]')
    const now = Date.now()
    if (onImage) {
      if (now - lastTapRef.current < 280) {
        if (scaleRef.current > 1.2) resetZoom()
        else zoomAt(e.clientX, e.clientY, 2.4)
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
      return
    }
    onClose()
  }

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[80] bg-black/92 flex items-center justify-center overflow-hidden touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer"
        aria-label="閉じる"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className="absolute left-2 md:left-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer"
            aria-label="前の画像"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className="absolute right-2 md:right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer"
            aria-label="次の画像"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}

      <img
        data-lightbox-image="true"
        src={images[index]}
        alt={`拡大画像 ${index + 1}`}
        className="max-w-[100vw] max-h-[100dvh] object-contain select-none"
        draggable={false}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: 'center center',
          cursor: transform.scale > 1.02 ? 'grab' : 'zoom-in',
        }}
      />

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1.5 rounded-full pointer-events-none">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`w-2 h-2 rounded-full ${idx === index ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
