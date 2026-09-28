export function AvatarIcon({
  url,
  nickname,
  size = 'md',
  onClick,
}: {
  url?: string
  nickname?: string
  size?: 'sm' | 'md' | 'lg'
  onClick?: (e: React.MouseEvent) => void
}) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-16 h-16 text-2xl',
  }

  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation()
          onClick(e)
        }
      }}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden bg-indigo-100 text-indigo-700 border border-slate-200 ${
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
    >
      {url ? (
        <img src={url} alt={nickname || 'ユーザー'} className="w-full h-full object-cover" />
      ) : (
        <span>{nickname ? nickname[0] : 'ユ'}</span>
      )}
    </div>
  )
}
