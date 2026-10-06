'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ImageCarousel({
  images,
  onOpenLightbox,
}: {
  images: string[]
  onOpenLightbox?: (index: number) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const movedRef = useRef(false)
  const indexRef = useRef(0)
  indexRef.current = currentIndex

  const goTo = (index: number) => {
    const count = images?.length ?? 0
    if (count < 1) return
    const next = (index + count) % count
    setCurrentIndex(next)
    const scroller = scrollerRef.current
    if (scroller) {
      scroller.scrollTo({ left: next * scroller.clientWidth, behavior: 'smooth' })
    }
  }

  if (!images || images.length === 0) return null

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    goTo(currentIndex + 1)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    goTo(currentIndex - 1)
  }

  const openLightbox = (e: React.MouseEvent | React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if (movedRef.current) return
    if (!onOpenLightbox) return
    e.stopPropagation()
    onOpenLightbox(indexRef.current)
  }

  return (
    <div className="relative w-full bg-slate-100 overflow-hidden group">
      <div
        className="hidden md:block"
        onClick={(e) => {
          if (!onOpenLightbox) return
          e.stopPropagation()
          onOpenLightbox(currentIndex)
        }}
      >
        <img
          src={images[currentIndex]}
          alt={`図面 ${currentIndex + 1}`}
          className={`w-full h-auto max-h-96 object-contain mx-auto ${
            onOpenLightbox ? 'cursor-zoom-in' : 'cursor-pointer'
          }`}
        />
      </div>

      <div
        ref={scrollerRef}
        className="flex md:hidden overflow-x-auto snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={() => {
          const scroller = scrollerRef.current
          if (!scroller) return
          const width = scroller.clientWidth
          if (width <= 0) return
          const next = Math.round(scroller.scrollLeft / width)
          const clamped = Math.min(images.length - 1, Math.max(0, next))
          setCurrentIndex((prev) => (prev === clamped ? prev : clamped))
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          movedRef.current = false
          ;(e.currentTarget as HTMLDivElement).dataset.touchX = String(e.clientX)
          ;(e.currentTarget as HTMLDivElement).dataset.touchY = String(e.clientY)
        }}
        onPointerMove={(e) => {
          const target = e.currentTarget as HTMLDivElement
          const x = Number(target.dataset.touchX)
          const y = Number(target.dataset.touchY)
          if (!Number.isFinite(x) || !Number.isFinite(y)) return
          if (Math.hypot(e.clientX - x, e.clientY - y) > 8) movedRef.current = true
        }}
        onClick={openLightbox}
      >
        {images.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="w-full min-w-full shrink-0 snap-center snap-always flex items-center justify-center"
          >
            <img
              src={src}
              alt={`図面 ${idx + 1}`}
              draggable={false}
              className={`w-full h-auto max-h-96 object-contain mx-auto select-none ${
                onOpenLightbox ? 'cursor-zoom-in' : 'cursor-pointer'
              }`}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-opacity opacity-80 hover:opacity-100"
            aria-label="前の画像"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-opacity opacity-80 hover:opacity-100"
            aria-label="次の画像"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-2 py-1 rounded-full pointer-events-none">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-white scale-110' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
