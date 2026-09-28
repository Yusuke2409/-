import { FLOOR_AREA_STEPS } from '@/lib/constants'

export function FloorAreaRangeSelects({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  minValue: string
  maxValue: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={minValue}
        onChange={(e) => onMinChange(e.target.value)}
        className="flex-1 min-w-0 p-2 text-xs border border-slate-200 rounded-lg bg-white"
      >
        <option value="">下限なし</option>
        {FLOOR_AREA_STEPS.map((n) => (
          <option key={`min-${n}`} value={String(n)}>
            {n}㎡以上
          </option>
        ))}
      </select>
      <span className="text-slate-400 text-xs shrink-0">〜</span>
      <select
        value={maxValue}
        onChange={(e) => onMaxChange(e.target.value)}
        className="flex-1 min-w-0 p-2 text-xs border border-slate-200 rounded-lg bg-white"
      >
        {FLOOR_AREA_STEPS.map((n) => (
          <option key={`max-${n}`} value={String(n)}>
            {n}㎡未満
          </option>
        ))}
        <option value="">上限なし</option>
      </select>
    </div>
  )
}
