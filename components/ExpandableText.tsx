'use client'

import { useEffect, useRef, useState } from 'react'

export function ExpandableText({
  text,
  className = '',
  maxLines = 7,
}: {
  text: string
  className?: string
  maxLines?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    setExpanded(false)
    setOverflows(false)
  }, [text])

  useEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    const check = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    }
    check()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [text, expanded])

  if (!text) return null

  return (
    <div>
      <p
        ref={textRef}
        className={`whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-7'} ${className}`}
        style={
          expanded
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {text}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setExpanded((open) => !open)
          }}
          className="mt-1 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
        >
          {expanded ? '閉じる' : 'さらに表示'}
        </button>
      )}
    </div>
  )
}
