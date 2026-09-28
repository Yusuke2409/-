export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-none flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  )
}
