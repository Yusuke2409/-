export const CHAT_IMAGE_MARKER = 'IMAGE:'

export const CONTACT_EMAIL = 'madocomi.official@gmail.com'

export const FLOOR_AREA_STEPS = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
const FLOOR_AREA_BAND_TENS = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190]

export const FLOOR_AREA_BANDS: { value: string; label: string; min: number | null; max: number | null }[] = [
  { value: 'under60', label: '60㎡以下', min: 0, max: 60 },
  ...FLOOR_AREA_BAND_TENS.map((n) => ({
    value: String(n),
    label: `${n}㎡台`,
    min: n,
    max: n + 10,
  })),
  { value: '200plus', label: '200㎡以上', min: 200, max: null },
]

export const MAKER_OPTIONS = [
  'ダイワハウス',
  '積水ハウス',
  '住友林業',
  '一条工務店',
  'アイ工務店',
  '三井ホーム',
  'ヤマト住建',
  'ヘーベルハウス',
  'ミサワホーム',
  'スウェーデンハウス',
  'セキスイハイム',
  'トヨタホーム',
  'パナソニック ホームズ',
  '桧家住宅',
  'クレバリーホーム',
  'ヤマダホームズ',
  'タマホーム',
  'アイフルホーム',
  'アキュラホーム',
  'ウィザースホーム',
  '日本ハウスホールディングス',
  '住友不動産',
  'セルコホーム',
  'アエラホーム',
  'その他',
]

export const QUALIFICATION_OPTIONS = [
  '一級建築士',
  '二級建築士',
  '木造建築士',
  'インテリアコーディネーター',
  '宅地建物取引士',
  '第一種電気工事士',
  '第二種電気工事士',
  '照明コンサルタント',
  'インテリアプランナー',
  '福祉住環境コーディネーター',
]
