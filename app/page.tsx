'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import {
  Home,
  Search,
  Heart,
  User,
  Image as ImageIcon,
  Filter,
  ShieldCheck,
  Clock,
  Upload,
  Award,
  MessageCircle,
  Trash2,
  Send,
  X,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Camera,
  Link as LinkIcon,
  Save,
  Plus,
  Minus,
  AlertTriangle,
  LogOut,
  Mail,
  Eye,
  EyeOff,
  MessageSquare,
} from 'lucide-react'

type Post = {
  id: number
  created_at: string
  image_urls: string[]
  doc_type: string
  layout?: string
  floors?: string
  maker?: string
  comment: string
  nickname?: string
  avatar_url?: string
  user_urls?: string[]
  bio?: string
  likes_count?: number
  user_id?: string
  floor_area_min?: number | null
  floor_area_max?: number | null
}

type Comment = {
  id: number
  created_at: string
  post_id: number
  nickname: string
  avatar_url?: string
  user_urls?: string[]
  bio?: string
  content: string
  parent_id?: number | null
  likes_count?: number
  dislikes_count?: number
}

type UserQualification = {
  id: number
  created_at: string
  nickname: string
  qualification_name: string
  cert_image_url?: string
  status: 'pending' | 'approved' | 'rejected'
}

type UserProfileView = {
  nickname: string
  avatar_url?: string
  user_urls?: string[]
  bio?: string
}

type ChatMessage = {
  id: number
  created_at: string
  sender_nickname: string
  recipient_nickname: string
  sender_id?: string
  content: string
  image_url?: string
}

const CHAT_IMAGE_MARKER = 'IMAGE:'

const CONTACT_EMAIL = 'madocomi.official@gmail.com'

const FLOOR_AREA_STEPS = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
const FLOOR_AREA_BAND_TENS = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190]

const FLOOR_AREA_BANDS: { value: string; label: string; min: number | null; max: number | null }[] = [
  { value: 'under60', label: '60㎡以下', min: 0, max: 60 },
  ...FLOOR_AREA_BAND_TENS.map((n) => ({
    value: String(n),
    label: `${n}㎡台`,
    min: n,
    max: n + 10,
  })),
  { value: '200plus', label: '200㎡以上', min: 200, max: null },
]

function formatFloorAreaBand(min?: number | string | null, max?: number | string | null) {
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

function PostMetaTags({ post, className = '' }: { post: Post; className?: string }) {
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

function FloorAreaRangeSelects({
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

const MAKER_OPTIONS = [
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

const QUALIFICATION_OPTIONS = [
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

function missingColumnFromError(message: string) {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column "([^"]+)" of relation/i)
  return match?.[1] ?? null
}

type PostAreaMeta = { maker?: string; min?: number | null; max?: number | null }

function stripPostMetaComment(comment: string) {
  return (comment || '').replace(/\n?\[\[mc:[\s\S]*\]\]\s*$/, '').trim()
}

function encodePostMetaComment(comment: string, meta: PostAreaMeta) {
  return `${stripPostMetaComment(comment)}\n[[mc:${JSON.stringify(meta)}]]`
}

function parsePostMetaComment(comment: string): PostAreaMeta {
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

function withPostMeta(post: {
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

async function insertPostRow(payload: Record<string, unknown>) {
  const current: Record<string, unknown> = { ...payload }
  for (let i = 0; i < 12; i++) {
    const { error } = await supabase.from('posts').insert([current])
    if (!error) return
    const column = missingColumnFromError(error.message)
    if (column && column in current) {
      delete current[column]
      continue
    }
    throw error
  }
  throw new Error('投稿に失敗しました')
}

function ImageCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) return null

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="relative w-full bg-slate-100 overflow-hidden group">
      <img
        src={images[currentIndex]}
        alt={`図面 ${currentIndex + 1}`}
        className="w-full h-auto max-h-96 object-contain mx-auto transition-all duration-300"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-opacity opacity-80 hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-opacity opacity-80 hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 px-2 py-1 rounded-full">
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

function AvatarIcon({
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'messages' | 'favorites' | 'mypage'>('home')
  const [posts, setPosts] = useState<Post[]>([])
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [likedPostIds, setLikedPostIds] = useState<number[]>([])
  const [comments, setComments] = useState<{ [postId: number]: Comment[] }>({})
  const [modalCommentInput, setModalCommentInput] = useState('')
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null)
  const [uploading, setUploading] = useState(false)

  const [likedCommentIds, setLikedCommentIds] = useState<number[]>([])
  const [dislikedCommentIds, setDislikedCommentIds] = useState<number[]>([])
  const [expandedCommentIds, setExpandedCommentIds] = useState<number[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const [viewUserProfile, setViewUserProfile] = useState<UserProfileView | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [selectedChatNick, setSelectedChatNick] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatImageFile, setChatImageFile] = useState<File | null>(null)
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null)
  const [sendingChat, setSendingChat] = useState(false)

  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authNoticeKind, setAuthNoticeKind] = useState<'success' | 'warning'>('success')
  const [canResendSignupEmail, setCanResendSignupEmail] = useState(false)
  const [resendingSignupEmail, setResendingSignupEmail] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactNotice, setContactNotice] = useState('')
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showQualApply, setShowQualApply] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)

  // プロフィール状態
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [userUrls, setUserUrls] = useState<string[]>([''])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // 資格申請
  const [selectedQualification, setSelectedQualification] = useState(QUALIFICATION_OPTIONS[0])
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPreviewUrl, setCertPreviewUrl] = useState<string | null>(null)
  const [submittingCert, setSubmittingCert] = useState(false)
  const [allUserQuals, setAllUserQuals] = useState<UserQualification[]>([])

  // 新規投稿
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [docType, setDocType] = useState('')
  const [layout, setLayout] = useState('')
  const [floors, setFloors] = useState('')
  const [floorAreaBand, setFloorAreaBand] = useState('')
  const [maker, setMaker] = useState('')
  const [comment, setComment] = useState('')
  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false) // 個人情報確認ダイアログ制御

  // 検索フィルター
  const [searchDocType, setSearchDocType] = useState('すべて')
  const [searchLayout, setSearchLayout] = useState('すべて')
  const [searchFloors, setSearchFloors] = useState('すべて')
  const [searchFloorAreaMin, setSearchFloorAreaMin] = useState('')
  const [searchFloorAreaMax, setSearchFloorAreaMax] = useState('')
  const [searchMakers, setSearchMakers] = useState<string[]>([])
  const [draftSearchMakers, setDraftSearchMakers] = useState<string[]>([])
  const [showSearchMakers, setShowSearchMakers] = useState(false)

  useEffect(() => {
    fetchPosts(null)
    fetchQualifications()
    fetchComments()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)

      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }

      // onAuthStateChange 内で直接別の Auth API を呼ぶと固まるため、処理を後ろに回す
      window.setTimeout(() => {
        if (nextSession?.user) {
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            fetchUserProfile(nextSession.user)
          }
        } else {
          resetLocalProfile()
          if (event === 'SIGNED_OUT') {
            fetchPosts(null)
          }
        }
      }, 0)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    applyFilter()
  }, [posts, searchDocType, searchLayout, searchFloors, searchFloorAreaMin, searchFloorAreaMax, searchMakers])

  useEffect(() => {
    if (session?.user?.email && !contactEmail) {
      setContactEmail(session.user.email)
    }
  }, [session, contactEmail])

  useEffect(() => {
    if (activeTab !== 'mypage') {
      setShowProfileEdit(false)
      setShowQualApply(false)
      setShowContactForm(false)
    }
  }, [activeTab])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim() || !authPassword) {
      return alert('メールアドレスとパスワードを入力してください')
    }
    if (authPassword.length < 6) {
      return alert('パスワードは6文字以上にしてください')
    }

    setAuthSubmitting(true)
    setAuthMessage('')
    setCanResendSignupEmail(false)

    try {
      if (authMode === 'signup') {
        const signupEmail = authEmail.trim()
        const { data, error } = await supabase.auth.signUp({
          email: signupEmail,
          password: authPassword,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error

        if (!data.user) {
          throw new Error(
            '会員登録に失敗しました。Supabase の Authentication でメール登録が有効か、同じプロジェクトを開いているか確認してください。'
          )
        }

        const alreadyRegistered = Array.isArray(data.user.identities) && data.user.identities.length === 0

        if (alreadyRegistered) {
          setAuthMode('login')
          setAuthNoticeKind('warning')
          setAuthMessage('このメールアドレスは登録済みです。ログインしてください。確認メールは再送されません。')
          setAuthPassword('')
          return
        }

        resetLocalProfile()

        if (data.session) {
          setAuthNoticeKind('success')
          setAuthMessage('会員登録が完了し、ログインしました。マイページでプロフィールを設定してください。')
        } else {
          const sentMessage = `${signupEmail} に認証メールを送付しました。メール内のリンクから登録を完了してください。`
          setAuthNoticeKind('success')
          setAuthMessage(sentMessage)
          setCanResendSignupEmail(true)
          alert(sentMessage)
        }
        setAuthPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        })
        if (error) throw error
        setAuthPassword('')
        setAuthNoticeKind('success')
        setAuthMessage('ログインしました。')
      }
    } catch (error: any) {
      const raw = error?.message || '不明なエラーです'
      const friendly =
        raw.includes('Error sending confirmation email') || raw.includes('sending confirmation email')
          ? '確認メールを送れなかったため、会員登録できませんでした。Supabase の Authentication → Sign In / Providers で Confirm email をいったん OFF にするか、メール送信用の SMTP を設定してください。'
          : raw
      alert('認証エラー: ' + friendly)
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert('ログアウトエラー: ' + error.message)
      return
    }
    setAuthEmail('')
    setAuthPassword('')
    setAuthNoticeKind('success')
    setAuthMessage('ログアウトしました。')
    setCanResendSignupEmail(false)
    resetLocalProfile()
  }

  const openContactMailto = (name: string, email: string, message: string) => {
    const subject = encodeURIComponent('【お問い合わせ】マドコミ')
    const body = encodeURIComponent(`お名前: ${name}\nメール: ${email}\n\n${message}`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = contactName.trim()
    const email = contactEmail.trim()
    const message = contactMessage.trim()

    if (!name || !email || !message) {
      return alert('お名前・メールアドレス・お問い合わせ内容を入力してください')
    }

    openContactMailto(name, email, message)
    setContactNotice('メールアプリが開きます。宛先と本文が入っているので、送信してください。')
  }

  const handleResendSignupEmail = async () => {
    if (!authEmail.trim()) return alert('メールアドレスを入力してください')
    setResendingSignupEmail(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authEmail.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      const sentMessage = `${authEmail.trim()} に認証メールを再送しました。届かない場合は迷惑メールフォルダも確認してください。`
      setAuthNoticeKind('success')
      setAuthMessage(sentMessage)
      alert(sentMessage)
    } catch (error: any) {
      alert('再送エラー: ' + error.message)
    } finally {
      setResendingSignupEmail(false)
    }
  }

  const requireLogin = () => {
    setAuthMode('login')
    setAuthNoticeKind('warning')
    setAuthMessage('この操作にはログインが必要です。メールアドレスでログインまたは会員登録してください。')
    setActiveTab('mypage')
    alert('ログインまたは会員登録が必要です。')
  }

  const goToHome = () => {
    setActiveTab('home')
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }, 0)
  }

  const goToSearch = () => {
    setActiveTab('search')
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }, 0)
  }

  const goToMessages = () => {
    if (!session?.user) {
      requireLogin()
      return
    }
    setSelectedChatNick(null)
    setActiveTab('messages')
    fetchMessages()
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }, 0)
  }

  const resetLocalProfile = () => {
    setNickname('')
    setAvatarUrl('')
    setBio('')
    setUserUrls([''])
    setLikedPostIds([])
    setChatMessages([])
    setSelectedChatNick(null)
    setChatImageFile(null)
    setChatImagePreview(null)
  }

  const applyUserRow = (data: any) => {
    if (data.nickname) setNickname(data.nickname)
    setAvatarUrl(data.avatar_url || '')
    setBio(data.bio || '')
    if (data.user_urls && Array.isArray(data.user_urls) && data.user_urls.length > 0) {
      setUserUrls(data.user_urls)
    } else if (data.user_url) {
      setUserUrls([data.user_url])
    } else {
      setUserUrls([''])
    }
  }

  const fetchUserProfile = async (authUser: Session['user']) => {
    const tryFindBy = async (column: string, value: string) => {
      const { data, error } = await supabase.from('users').select('*').eq(column, value).maybeSingle()
      if (error || !data) return null
      return data
    }

    const belongsToThisUser = (row: any) => {
      if (row.user_id && row.user_id === authUser.id) return true
      if (row.email && authUser.email && row.email === authUser.email) return true
      if (!row.user_id && !row.email) return true
      return false
    }

    let row =
      (await tryFindBy('user_id', authUser.id)) ||
      (authUser.email ? await tryFindBy('email', authUser.email) : null)

    const metaNick = (authUser.user_metadata?.nickname as string | undefined)?.trim() || ''

    if (!row && metaNick) {
      const byNick = await tryFindBy('nickname', metaNick)
      if (byNick && belongsToThisUser(byNick)) {
        row = byNick
      }
    }

    if (row && belongsToThisUser(row)) {
      applyUserRow(row)
      fetchPosts(authUser, row.nickname)
      fetchMessages(row.nickname)
      return
    }

    if (metaNick) {
      setNickname(metaNick)
      setAvatarUrl('')
      setBio('')
      setUserUrls([''])
      fetchPosts(authUser, metaNick)
      fetchMessages(metaNick)
      return
    }

    resetLocalProfile()
    fetchPosts(authUser, '')
  }

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...userUrls]
    newUrls[index] = value
    setUserUrls(newUrls)
  }

  const addUrlField = () => {
    if (userUrls.length < 3) {
      setUserUrls([...userUrls, ''])
    }
  }

  const removeUrlField = (index: number) => {
    if (userUrls.length > 1) {
      setUserUrls(userUrls.filter((_, i) => i !== index))
    } else {
      setUserUrls([''])
    }
  }

  const handleSaveProfile = async () => {
    if (!session?.user) {
      requireLogin()
      return
    }
    if (!nickname.trim()) return alert('ニックネームを入力してください')
    setSavingProfile(true)

    const filteredUrls = userUrls.map((u) => u.trim()).filter(Boolean).slice(0, 3)
    const trimmedNick = nickname.trim()

    try {
      const baseRow = {
        nickname: trimmedNick,
        avatar_url: avatarUrl,
        bio: bio.trim(),
        user_urls: filteredUrls,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('users').upsert([
        {
          ...baseRow,
          email: session.user.email,
          user_id: session.user.id,
        },
      ])

      if (error) {
        const { error: fallbackError } = await supabase.from('users').upsert([baseRow])
        if (fallbackError) throw fallbackError
      }

      await supabase.auth.updateUser({ data: { nickname: trimmedNick } })

      alert('プロフィール情報を保存しました！')
      fetchPosts(session.user, trimmedNick)
      fetchComments()
      fetchMessages(trimmedNick)
    } catch (error: any) {
      alert('保存エラー: ' + error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const fetchQualifications = async () => {
    const { data, error } = await supabase
      .from('user_qualifications')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setAllUserQuals(data)
    }
  }

  const fetchPosts = async (authUser?: Session['user'] | null, userNick?: string) => {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('id', { ascending: false })

    const { data: usersData } = await supabase.from('users').select('*')
    const { data: likesData } = await supabase.from('likes').select('*')

    if (postsError) return

    const usersMap: { [nick: string]: any } = {}
    if (usersData) {
      usersData.forEach((u) => {
        usersMap[u.nickname] = u
      })
    }

    const likeCounts: { [key: number]: number } = {}
    const userLikedIds: number[] = []
    const currentNick = userNick ?? nickname

    if (likesData) {
      likesData.forEach((like: any) => {
        likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1

        if (!authUser) return

        const isMine =
          (like.user_id && like.user_id === authUser.id) ||
          (like.user_email && like.user_email === authUser.email) ||
          (!like.user_id && !like.user_email && currentNick && like.nickname === currentNick)

        if (isMine && !userLikedIds.includes(like.post_id)) {
          userLikedIds.push(like.post_id)
        }
      })
    }

    const formattedPosts = (postsData || []).map((post) => {
      const u = usersMap[post.nickname]
      const metaFields = withPostMeta(post)
      return {
        ...post,
        ...metaFields,
        avatar_url: u?.avatar_url || post.avatar_url,
        bio: u?.bio || post.bio,
        user_urls: u?.user_urls || (u?.user_url ? [u.user_url] : post.user_urls || []),
        image_urls:
          post.image_urls && post.image_urls.length > 0
            ? post.image_urls
            : post.image_url
            ? [post.image_url]
            : [],
        likes_count: likeCounts[post.id] || 0,
      }
    })

    setPosts(formattedPosts)
    setFilteredPosts(formattedPosts)
    setLikedPostIds(userLikedIds)
  }

  const fetchComments = async () => {
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: true })

    const { data: usersData } = await supabase.from('users').select('*')

    if (!error && commentsData) {
      const usersMap: { [nick: string]: any } = {}
      if (usersData) {
        usersData.forEach((u) => {
          usersMap[u.nickname] = u
        })
      }

      const grouped: { [postId: number]: Comment[] } = {}
      commentsData.forEach((c) => {
        if (!grouped[c.post_id]) grouped[c.post_id] = []
        const u = usersMap[c.nickname]
        grouped[c.post_id].push({
          ...c,
          avatar_url: u?.avatar_url || c.avatar_url,
          bio: u?.bio || c.bio,
          user_urls: u?.user_urls || (u?.user_url ? [u.user_url] : c.user_urls || []),
          likes_count: c.likes_count || 0,
          dislikes_count: c.dislikes_count || 0,
        })
      })
      setComments(grouped)
    }
  }

  const fetchMessages = async (myNick = nickname) => {
    if (!myNick.trim()) {
      setChatMessages([])
      return
    }

    const { data: sent, error: sentError } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_nickname', myNick.trim())

    const { data: received, error: receivedError } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_nickname', myNick.trim())

    if (sentError || receivedError) {
      const err = sentError || receivedError
      if (err?.message?.includes('Could not find the table') || err?.code === '42P01' || err?.message?.includes('schema cache')) {
        console.warn('messages テーブルがありません')
      }
      setChatMessages([])
      return
    }

    const merged = [...(sent || []), ...(received || [])]
    const unique = new Map<number, ChatMessage>()
    merged.forEach((m) => unique.set(m.id, m))
    const list = Array.from(unique.values())
      .map((m) => {
        let image_url = m.image_url
        let content = m.content || ''
        if (!image_url && content.includes(CHAT_IMAGE_MARKER)) {
          const idx = content.lastIndexOf(CHAT_IMAGE_MARKER)
          image_url = content.slice(idx + CHAT_IMAGE_MARKER.length).trim()
          content = content.slice(0, idx).trim()
        }
        return { ...m, content, image_url }
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    setChatMessages(list)
  }

  const openChatWith = (targetNick: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    setViewUserProfile(null)
    setSelectedPost(null)

    if (!session?.user) {
      requireLogin()
      return
    }
    if (!nickname.trim()) {
      setActiveTab('mypage')
      setShowProfileEdit(true)
      alert('メッセージを送るには、マイページでニックネームを保存してください')
      return
    }
    if (targetNick.trim() === nickname.trim()) {
      alert('自分自身にはメッセージを送れません。別のアカウントのプロフィールから送ってください。')
      return
    }

    setSelectedChatNick(targetNick.trim())
    setActiveTab('messages')
    fetchMessages(nickname.trim())
  }

  const handleSendChat = async () => {
    if (!session?.user) {
      requireLogin()
      return
    }
    if (!nickname.trim()) {
      return alert('マイページでニックネームを保存してください')
    }
    if (!selectedChatNick) return
    const text = chatInput.trim()
    if (!text && !chatImageFile) return

    setSendingChat(true)
    try {
      let imageUrl = ''
      if (chatImageFile) {
        const fileExt = chatImageFile.name.split('.').pop()
        const fileName = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('floor-plans').upload(fileName, chatImageFile)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('floor-plans').getPublicUrl(fileName)
        imageUrl = publicUrlData.publicUrl
      }

      const payload: Record<string, string> = {
        sender_nickname: nickname.trim(),
        recipient_nickname: selectedChatNick,
        sender_id: session.user.id,
        content: text || (imageUrl ? '（画像）' : ''),
      }
      if (imageUrl) payload.image_url = imageUrl

      let { error } = await supabase.from('messages').insert([payload])
      if (error) {
        const { sender_id: _sid, image_url: _img, ...withoutExtra } = payload
        const fallbackContent = imageUrl
          ? `${withoutExtra.content || ''}\n${CHAT_IMAGE_MARKER}${imageUrl}`.trim()
          : withoutExtra.content
        const retry = await supabase.from('messages').insert([
          {
            ...withoutExtra,
            content: fallbackContent,
          },
        ])
        error = retry.error
      }
      if (error) {
        if (
          error.message.includes('Could not find the table') ||
          error.code === '42P01' ||
          error.message.includes('schema cache') ||
          error.message.includes('does not exist')
        ) {
          throw new Error(
            'メッセージ用テーブルがありません。Supabase の SQL Editor で messages テーブルを作成してください。'
          )
        }
        throw error
      }
      setChatInput('')
      setChatImageFile(null)
      setChatImagePreview(null)
      await fetchMessages(nickname.trim())
    } catch (error: any) {
      alert('送信エラー: ' + error.message)
    } finally {
      setSendingChat(false)
    }
  }

  const handleChatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setChatImageFile(file)
    setChatImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const applyFilter = () => {
    let result = [...posts]

    if (searchDocType !== 'すべて') {
      result = result.filter((p) => p.doc_type === searchDocType)
    }
    if (searchLayout !== 'すべて') {
      result = result.filter((p) => p.layout === searchLayout)
    }
    if (searchFloors !== 'すべて') {
      result = result.filter((p) => p.floors === searchFloors)
    }
    if (searchMakers.length > 0) {
      result = result.filter((p) => p.maker && searchMakers.includes(p.maker))
    }
    if (searchFloorAreaMin || searchFloorAreaMax) {
      const sMin = searchFloorAreaMin ? Number(searchFloorAreaMin) : 0
      const sMax = searchFloorAreaMax ? Number(searchFloorAreaMax) : Number.POSITIVE_INFINITY
      result = result.filter((p) => {
        if (p.floor_area_min == null && p.floor_area_max == null) return false
        const pMin = p.floor_area_min ?? 0
        const pMax = p.floor_area_max ?? Number.POSITIVE_INFINITY
        return pMin < sMax && pMax > sMin
      })
    }

    setFilteredPosts(result)
  }

  const handleToggleLike = async (postId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    if (!session?.user) {
      requireLogin()
      return
    }

    const isLiked = likedPostIds.includes(postId)

    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', session.user.id)

      if (error) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('nickname', nickname)
      }
    } else {
      const { error } = await supabase.from('likes').insert([
        {
          post_id: postId,
          user_id: session.user.id,
          user_email: session.user.email,
          nickname: nickname,
        },
      ])

      if (error) {
        const { error: fallbackError } = await supabase.from('likes').insert([
          {
            post_id: postId,
            nickname: nickname,
          },
        ])
        if (fallbackError) {
          alert('いいねの保存に失敗しました: ' + fallbackError.message)
          return
        }
      }
    }

    fetchPosts(session.user, nickname)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    setSelectedFiles(files)

    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.user) {
      requireLogin()
      return
    }
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploadingAvatar(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(fileName)

      const newAvatarUrl = publicUrlData.publicUrl
      setAvatarUrl(newAvatarUrl)

      const filteredUrls = userUrls.map((u) => u.trim()).filter(Boolean).slice(0, 3)

      await supabase.from('users').upsert([
        {
          nickname: nickname.trim(),
          avatar_url: newAvatarUrl,
          bio: bio.trim(),
          user_urls: filteredUrls,
          updated_at: new Date().toISOString(),
        },
      ])

      alert('プロフィール画像を更新・保存しました！')
      fetchPosts(session.user, nickname)
      fetchComments()
    } catch (error: any) {
      alert('画像アップロードエラー: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setCertFile(file)
    setCertPreviewUrl(URL.createObjectURL(file))
  }

  // 投稿ボタンが押された時の処理（まず確認モーダルを表示）
  const handleOpenPrivacyConfirm = () => {
    if (!session?.user) {
      requireLogin()
      return
    }
    if (!nickname.trim()) {
      setActiveTab('mypage')
      return alert('投稿するには、マイページでニックネームを設定してください')
    }
    if (selectedFiles.length === 0) return alert('画像を少なくとも1枚選択してください')
    if (!docType) return alert('図面種類を選択してください')
    if (!layout) return alert('間取りを選択してください')
    if (!floors) return alert('階数を選択してください')
    if (!floorAreaBand) return alert('延べ面積を選択してください')
    if (!maker) return alert('メーカーを選択してください')
    if (!comment.trim()) return alert('説明・コメントを入力してください')
    setShowPrivacyConfirm(true)
  }

  // 確認後に実際にアップロードを実行する関数
  const handleUpload = async () => {
    if (!session?.user) {
      requireLogin()
      return
    }
    setShowPrivacyConfirm(false)
    setUploading(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('floor-plans')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('floor-plans')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrlData.publicUrl)
      }

      const filteredUrls = userUrls.map((u) => u.trim()).filter(Boolean).slice(0, 3)
      const areaBand = FLOOR_AREA_BANDS.find((b) => b.value === floorAreaBand)

      const postPayload = {
        image_urls: uploadedUrls,
        image_url: uploadedUrls[0],
        doc_type: docType,
        layout: layout,
        floors: floors,
        maker: maker,
        floor_area_min: areaBand ? areaBand.min : null,
        floor_area_max: areaBand ? areaBand.max : null,
        comment: encodePostMetaComment(comment.trim(), {
          maker,
          min: areaBand ? areaBand.min : null,
          max: areaBand ? areaBand.max : null,
        }),
        nickname: nickname,
        avatar_url: avatarUrl,
        bio: bio,
        user_urls: filteredUrls,
        user_id: session.user.id,
        user_email: session.user.email,
      }

      await insertPostRow(postPayload)

      setSelectedFiles([])
      setPreviewUrls([])
      setDocType('')
      setLayout('')
      setFloors('')
      setFloorAreaBand('')
      setMaker('')
      setComment('')
      alert('投稿が完了しました！')
      fetchPosts(session.user, nickname)
    } catch (error: any) {
      alert('投稿エラー: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePost = async (postId: number, imageUrls: string[], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    if (!confirm('この投稿を削除しますか？（サーバーの画像ファイルも完全削除されます）')) return

    try {
      await supabase.from('comments').delete().eq('post_id', postId)
      await supabase.from('likes').delete().eq('post_id', postId)

      const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId)
      if (deleteError) throw deleteError

      if (imageUrls && imageUrls.length > 0) {
        const fileNamesToRemove = imageUrls
          .map((url) => {
            const parts = url.split('/')
            return parts[parts.length - 1]
          })
          .filter(Boolean)

        if (fileNamesToRemove.length > 0) {
          await supabase.storage.from('floor-plans').remove(fileNamesToRemove)
        }
      }

      alert('投稿と関連画像を削除しました！')
      if (selectedPost?.id === postId) {
        setSelectedPost(null)
      }
      fetchPosts(session?.user ?? null, nickname)
    } catch (error: any) {
      alert('削除エラー: ' + error.message)
    }
  }

  const handleCommentReaction = (commentId: number, type: 'like' | 'dislike') => {
    if (!session?.user) {
      requireLogin()
      return
    }
    const isLiked = likedCommentIds.includes(commentId)
    const isDisliked = dislikedCommentIds.includes(commentId)

    if (type === 'like') {
      if (isLiked) {
        setLikedCommentIds(likedCommentIds.filter((id) => id !== commentId))
      } else {
        setLikedCommentIds([...likedCommentIds, commentId])
        setDislikedCommentIds(dislikedCommentIds.filter((id) => id !== commentId))
      }
    } else {
      if (isDisliked) {
        setDislikedCommentIds(dislikedCommentIds.filter((id) => id !== commentId))
      } else {
        setDislikedCommentIds([...dislikedCommentIds, commentId])
        setLikedCommentIds(likedCommentIds.filter((id) => id !== commentId))
      }
    }
  }

  const handleAddModalComment = async (postId: number) => {
    if (!modalCommentInput || !modalCommentInput.trim()) return

    const displayName = session?.user ? nickname.trim() : 'ゲスト'
    if (session?.user && !displayName) {
      setActiveTab('mypage')
      return alert('コメントするには、マイページでニックネームを設定してください')
    }

    try {
      const filteredUrls = session?.user
        ? userUrls.map((u) => u.trim()).filter(Boolean).slice(0, 3)
        : []

      const insertData: any = {
        post_id: postId,
        nickname: displayName,
        avatar_url: session?.user ? avatarUrl : '',
        bio: session?.user ? bio : '',
        user_urls: filteredUrls,
        content: modalCommentInput.trim(),
      }

      if (replyTarget) {
        insertData.parent_id = replyTarget.id
        if (!expandedCommentIds.includes(replyTarget.id)) {
          setExpandedCommentIds((prev) => [...prev, replyTarget.id])
        }
      }

      const { error } = await supabase.from('comments').insert([insertData])
      if (error) throw error

      setModalCommentInput('')
      setReplyTarget(null)
      fetchComments()
    } catch (error: any) {
      alert('コメント送信エラー: ' + error.message)
    }
  }

  const toggleReplyExpand = (commentId: number) => {
    setExpandedCommentIds((prev) =>
      prev.includes(commentId)
        ? prev.filter((id) => id !== commentId)
        : [...prev, commentId]
    )
  }

  const handleApplyQualification = async () => {
    if (!session?.user) {
      requireLogin()
      return
    }
    if (!nickname.trim()) return alert('ニックネームを入力してください')
    if (!certFile) return alert('資格証の写真をアップロードしてください')

    setSubmittingCert(true)

    try {
      const fileExt = certFile.name.split('.').pop()
      const fileName = `cert_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, certFile)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('floor-plans')
        .getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('user_qualifications').insert([
        {
          nickname: nickname,
          qualification_name: selectedQualification,
          cert_image_url: publicUrlData.publicUrl,
          status: 'pending',
        },
      ])

      if (insertError) throw insertError

      alert(`「${selectedQualification}」の申請を送信しました！確認までお待ちください。`)
      setCertFile(null)
      setCertPreviewUrl(null)
      fetchQualifications()
    } catch (error: any) {
      alert('申請エラー: ' + error.message)
    } finally {
      setSubmittingCert(false)
    }
  }

  const getApprovedQualsForUser = (userNick?: string) => {
    if (!userNick) return []
    return allUserQuals
      .filter((q) => q.nickname === userNick && q.status === 'approved')
      .map((q) => q.qualification_name)
  }

  const openUserProfile = async (user: UserProfileView, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!user.nickname || user.nickname === 'ゲスト') return

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', user.nickname)
      .single()

    const toUrlList = (urls: unknown, fallback?: string) => {
      if (Array.isArray(urls)) return urls.filter(Boolean)
      if (typeof urls === 'string' && urls) return [urls]
      if (fallback) return [fallback]
      return []
    }

    if (data) {
      setViewUserProfile({
        nickname: data.nickname,
        avatar_url: data.avatar_url || user.avatar_url,
        bio: data.bio || user.bio,
        user_urls: toUrlList(data.user_urls, data.user_url) || toUrlList(user.user_urls),
      })
    } else {
      setViewUserProfile({
        ...user,
        user_urls: toUrlList(user.user_urls),
      })
    }
  }

  const myApprovedQuals = allUserQuals.filter((q) => q.nickname === nickname && q.status === 'approved')
  const myPendingQuals = allUserQuals.filter((q) => q.nickname === nickname && q.status === 'pending')

  const favoritePosts = posts.filter((post) => likedPostIds.includes(post.id))
  const myPosts = posts.filter((post) => {
    if (session?.user && post.user_id && post.user_id === session.user.id) return true
    return !!nickname && post.nickname === nickname
  })

  const renderCommentBox = (c: Comment, isChild = false) => {
    const quals = getApprovedQualsForUser(c.nickname)
    const isLiked = likedCommentIds.includes(c.id)
    const isDisliked = dislikedCommentIds.includes(c.id)

    const baseLikes = c.likes_count || 0
    const baseDislikes = c.dislikes_count || 0

    const displayLikes = baseLikes + (isLiked ? 1 : 0)
    const displayDislikes = baseDislikes + (isDisliked ? 1 : 0)

    return (
      <div
        className={`${
          isChild
            ? 'bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60'
            : 'bg-slate-50 p-3 rounded-xl border border-slate-100'
        } space-y-1.5`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <AvatarIcon
              url={c.avatar_url}
              nickname={c.nickname}
              size="sm"
              onClick={
                c.nickname === 'ゲスト'
                  ? undefined
                  : (e) =>
                      openUserProfile(
                        { nickname: c.nickname, avatar_url: c.avatar_url, user_urls: c.user_urls, bio: c.bio },
                        e
                      )
              }
            />
            {c.nickname === 'ゲスト' ? (
              <span className="font-bold text-xs text-slate-800">ゲスト</span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openUserProfile(
                    { nickname: c.nickname, avatar_url: c.avatar_url, user_urls: c.user_urls, bio: c.bio },
                    e
                  )
                }}
                className="font-bold text-xs text-slate-800 hover:underline cursor-pointer"
              >
                {c.nickname}
              </button>
            )}
            {quals.map((q, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.1 rounded-full text-[9px] font-bold"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                {q}
              </span>
            ))}
          </div>

          {!isChild && (
            <button
              onClick={() => setReplyTarget(c)}
              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
            >
              <CornerDownRight className="w-3 h-3" />
              返信する
            </button>
          )}
        </div>

        <p className="text-xs text-slate-700 whitespace-pre-wrap pl-9">{c.content}</p>

        <div className="flex items-center gap-3 pt-0.5 pl-9">
          <button
            onClick={() => handleCommentReaction(c.id, 'like')}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isLiked ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-indigo-600' : ''}`} />
            {displayLikes > 0 && <span>{displayLikes}</span>}
          </button>

          <button
            onClick={() => handleCommentReaction(c.id, 'dislike')}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isDisliked ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-rose-600' : ''}`} />
            {displayDislikes > 0 && <span>{displayDislikes}</span>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-800">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm flex justify-between items-center gap-2">
        <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">Madori Community：マドコミ</h1>
        {session?.user?.email ? (
          <span className="text-[11px] text-slate-500 truncate max-w-[45%] text-right">
            {session.user.email}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('mypage')}
            className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer shrink-0"
          >
            ログイン
          </button>
        )}
      </header>

      <main className="max-w-lg mx-auto p-4">
        {/* ホームタブ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base text-slate-700 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                新規投稿
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  間取り画像（複数選択可）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {previewUrls.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500 font-semibold">選択中: {previewUrls.length}枚</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {previewUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`プレビュー ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">図面種類</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">未選択</option>
                    <option value="平面図">平面図</option>
                    <option value="電気図面">電気図面</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">間取り</label>
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">未選択</option>
                    <option value="1LDK">1LDK</option>
                    <option value="2LDK">2LDK</option>
                    <option value="3LDK">3LDK</option>
                    <option value="4LDK">4LDK</option>
                    <option value="それ以上">それ以上</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">階数</label>
                  <select
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">未選択</option>
                    <option value="平屋">平屋</option>
                    <option value="2階建">2階建</option>
                    <option value="3階建">3階建</option>
                    <option value="それ以上">それ以上</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">延べ面積</label>
                <select
                  value={floorAreaBand}
                  onChange={(e) => setFloorAreaBand(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">未選択</option>
                  {FLOOR_AREA_BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">メーカー</label>
                <select
                  value={maker}
                  onChange={(e) => setMaker(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">未選択</option>
                  {MAKER_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">説明・コメント</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="アドバイスしてほしい点などを入力"
                  rows={2}
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleOpenPrivacyConfirm}
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? '投稿中...' : '投稿する'}
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="font-bold text-sm text-slate-500 uppercase tracking-wider">最新の投稿</h2>
              {posts.map((post) => {
                const isLiked = likedPostIds.includes(post.id)
                const postUserQuals = getApprovedQualsForUser(post.nickname)
                const postComments = comments[post.id] || []

                return (
                  <div
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post)
                      setReplyTarget(null)
                    }}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-2 cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <div className="p-3 border-b border-slate-100 flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <AvatarIcon
                          url={post.avatar_url}
                          nickname={post.nickname}
                          size="md"
                          onClick={(e) =>
                            openUserProfile(
                              { nickname: post.nickname || '匿名ユーザー', avatar_url: post.avatar_url, user_urls: post.user_urls, bio: post.bio },
                              e
                            )
                          }
                        />

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openUserProfile(
                                  { nickname: post.nickname || '匿名ユーザー', avatar_url: post.avatar_url, user_urls: post.user_urls, bio: post.bio },
                                  e
                                )
                              }}
                              className="font-bold text-sm text-slate-800 hover:underline cursor-pointer"
                            >
                              {post.nickname || '匿名ユーザー'}
                            </button>
                            <span className="text-[11px] text-slate-400">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {postUserQuals.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {postUserQuals.map((q, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-full text-[10px] font-bold"
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  {q}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {post.nickname === nickname && (
                        <button
                          onClick={(e) => handleDeletePost(post.id, post.image_urls, e)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="投稿を削除"
                        >
                          <Trash2 className="w-5 h-5 text-slate-400 hover:text-rose-600" />
                        </button>
                      )}
                    </div>

                    <PostMetaTags post={post} className="px-3" />

                    <ImageCarousel images={post.image_urls} />

                    <div className="px-3 pb-3 space-y-2">
                      {post.comment && <p className="text-sm text-slate-700 line-clamp-2">{post.comment}</p>}

                      <div className="flex items-center gap-6 pt-2 text-xs text-slate-500 border-t border-slate-100">
                        <button
                          onClick={(e) => handleToggleLike(post.id, e)}
                          className="flex items-center gap-1.5 font-medium transition-colors hover:text-red-500 cursor-pointer"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isLiked ? 'text-red-500 fill-red-500' : 'text-slate-400'
                            }`}
                          />
                          <span className={isLiked ? 'text-red-500 font-bold' : ''}>
                            {post.likes_count || 0}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 font-medium hover:text-indigo-600">
                          <MessageCircle className="w-4 h-4 text-slate-400" />
                          <span>{postComments.length} コメント</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 検索タブ */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="font-bold text-base text-slate-700 flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                絞り込み検索
              </h2>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">図面種類</label>
                  <select
                    value={searchDocType}
                    onChange={(e) => setSearchDocType(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="すべて">すべて</option>
                    <option value="平面図">平面図</option>
                    <option value="電気図面">電気図面</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">間取り</label>
                  <select
                    value={searchLayout}
                    onChange={(e) => setSearchLayout(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="すべて">すべて</option>
                    <option value="1LDK">1LDK</option>
                    <option value="2LDK">2LDK</option>
                    <option value="3LDK">3LDK</option>
                    <option value="4LDK">4LDK</option>
                    <option value="それ以上">それ以上</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">階数</label>
                  <select
                    value={searchFloors}
                    onChange={(e) => setSearchFloors(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="すべて">すべて</option>
                    <option value="平屋">平屋</option>
                    <option value="2階建">2階建</option>
                    <option value="3階建">3階建</option>
                    <option value="それ以上">それ以上</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">延べ面積</label>
                <FloorAreaRangeSelects
                  minValue={searchFloorAreaMin}
                  maxValue={searchFloorAreaMax}
                  onMinChange={setSearchFloorAreaMin}
                  onMaxChange={setSearchFloorAreaMax}
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">メーカー</label>
                <button
                  type="button"
                  onClick={() => {
                    if (!showSearchMakers) setDraftSearchMakers(searchMakers)
                    setShowSearchMakers(!showSearchMakers)
                  }}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white flex items-center justify-between gap-2 text-left"
                >
                  <span className="truncate text-slate-700">
                    {searchMakers.length === 0 ? 'すべて' : searchMakers.join('、')}
                  </span>
                  {showSearchMakers ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {showSearchMakers && (
                  <div className="absolute z-20 mt-1 w-full border border-slate-200 rounded-lg bg-white shadow-md overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-white">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchMakers(draftSearchMakers)
                          setShowSearchMakers(false)
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs cursor-pointer"
                      >
                        完了
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <label className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 border-b border-slate-100">
                        <input
                          type="checkbox"
                          checked={draftSearchMakers.length === 0}
                          onChange={() => setDraftSearchMakers([])}
                          className="rounded border-slate-300"
                        />
                        すべて
                      </label>
                      {MAKER_OPTIONS.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={draftSearchMakers.includes(name)}
                            onChange={() => {
                              setDraftSearchMakers((prev) =>
                                prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
                              )
                            }}
                            className="rounded border-slate-300"
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500">該当件数: {filteredPosts.length} 件</p>
              {filteredPosts.map((post) => {
                const isLiked = likedPostIds.includes(post.id)
                const postComments = comments[post.id] || []
                return (
                  <div
                    key={post.id}
                    onClick={() => {
                      setSelectedPost(post)
                      setReplyTarget(null)
                    }}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm cursor-pointer hover:border-slate-300"
                  >
                    <ImageCarousel images={post.image_urls} />
                    <div className="p-3 space-y-2">
                      {post.comment && <p className="text-sm text-slate-700 line-clamp-2">{post.comment}</p>}
                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(post.id, e)}
                          className="flex items-center gap-1 font-medium hover:text-red-500 cursor-pointer"
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                          {post.likes_count || 0}
                        </button>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {postComments.length}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* お気に入りタブ */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <h2 className="font-bold text-base text-slate-700 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              お気に入りした投稿 ({favoritePosts.length})
            </h2>

            {!session?.user ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 space-y-3">
                <p className="text-sm">お気に入りを見るにはログインが必要です。</p>
                <button
                  type="button"
                  onClick={requireLogin}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  ログイン / 会員登録へ
                </button>
              </div>
            ) : favoritePosts.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400">
                <p className="text-sm">お気に入り登録した投稿はまだありません。</p>
              </div>
            ) : (
              favoritePosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    setSelectedPost(post)
                    setReplyTarget(null)
                  }}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm cursor-pointer hover:border-slate-300"
                >
                  <ImageCarousel images={post.image_urls} />
                  <div className="p-3 space-y-2">
                    {post.comment && <p className="text-sm text-slate-700 line-clamp-2">{post.comment}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* メッセージタブ */}
        {activeTab === 'messages' && (
          <div className="space-y-3">
            <h2 className="font-bold text-base text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              メッセージ
            </h2>

            {!session?.user ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 space-y-3">
                <p className="text-sm">メッセージを見るにはログインが必要です。</p>
                <button
                  type="button"
                  onClick={requireLogin}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  ログイン / 会員登録へ
                </button>
              </div>
            ) : !nickname.trim() ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 space-y-3">
                <p className="text-sm">ニックネームを設定するとメッセージを使えます。</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('mypage')
                    setShowProfileEdit(true)
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  マイページで設定する
                </button>
              </div>
            ) : selectedChatNick ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
                <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChatNick(null)}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    ← 一覧
                  </button>
                  <p className="font-bold text-sm text-slate-800 truncate">{selectedChatNick}</p>
                </div>
                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[50vh] bg-slate-50">
                  {chatMessages
                    .filter(
                      (m) =>
                        (m.sender_nickname === nickname && m.recipient_nickname === selectedChatNick) ||
                        (m.sender_nickname === selectedChatNick && m.recipient_nickname === nickname)
                    )
                    .map((m) => {
                      const mine = m.sender_nickname === nickname
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                              mine ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                            }`}
                          >
                            {m.image_url && (
                              <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
                                <img
                                  src={m.image_url}
                                  alt="送信画像"
                                  className="max-h-48 w-full object-contain rounded-lg bg-black/10"
                                />
                              </a>
                            )}
                            {m.content && m.content !== '（画像）' && (
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            )}
                            <p className={`text-[10px] mt-1 ${mine ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {new Date(m.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
                <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
                  {chatImagePreview && (
                    <div className="relative w-20 h-20">
                      <img src={chatImagePreview} alt="送信前プレビュー" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setChatImageFile(null)
                          setChatImagePreview(null)
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer shrink-0">
                      <ImageIcon className="w-5 h-5" />
                      <input type="file" accept="image/*" onChange={handleChatImageChange} className="hidden" />
                    </label>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="メッセージを入力..."
                    className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChat()
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendChat}
                    disabled={sendingChat}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const me = nickname.trim()
                  const threads = new Map<string, ChatMessage>()
                  chatMessages.forEach((m) => {
                    const other = m.sender_nickname === me ? m.recipient_nickname : m.sender_nickname
                    const prev = threads.get(other)
                    if (!prev || new Date(m.created_at) > new Date(prev.created_at)) {
                      threads.set(other, m)
                    }
                  })
                  const list = Array.from(threads.entries()).sort(
                    (a, b) => new Date(b[1].created_at).getTime() - new Date(a[1].created_at).getTime()
                  )

                  if (list.length === 0) {
                    return (
                      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400">
                        <p className="text-sm">まだメッセージはありません。</p>
                        <p className="text-xs mt-2">コメント投稿者のプロフィールから送れます。</p>
                      </div>
                    )
                  }

                  return list.map(([other, last]) => (
                    <button
                      key={other}
                      type="button"
                      onClick={() => setSelectedChatNick(other)}
                      className="w-full text-left bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 cursor-pointer"
                    >
                      <p className="font-bold text-sm text-slate-800">{other}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {last.image_url || last.content?.includes('IMAGE:') ? '画像' : last.content}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(last.created_at).toLocaleString()}
                      </p>
                    </button>
                  ))
                })()}
              </div>
            )}
          </div>
        )}

        {/* マイページタブ */}
        {activeTab === 'mypage' && (
          <div className="space-y-4">
            {!session?.user && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="font-bold text-base text-slate-700 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                会員登録・ログイン
              </h2>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setAuthMessage('')
                      }}
                      className={`flex-1 py-2 text-xs font-bold cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      ログイン
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup')
                        setAuthMessage('')
                      }}
                      className={`flex-1 py-2 text-xs font-bold cursor-pointer ${
                        authMode === 'signup'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      会員登録
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">メールアドレス</label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">パスワード（6文字以上）</label>
                    <div className="relative">
                      <input
                        type={showAuthPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="パスワード"
                        autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                        className="w-full p-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showAuthPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                      >
                        {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {authMessage && (
                    <div
                      className={`text-xs font-medium p-3 rounded-lg border ${
                        authNoticeKind === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <p>{authMessage}</p>
                      {canResendSignupEmail && authMode === 'signup' && (
                        <button
                          type="button"
                          onClick={handleResendSignupEmail}
                          disabled={resendingSignupEmail}
                          className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
                        >
                          {resendingSignupEmail ? '再送中...' : '認証メールを再送する'}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {authSubmitting
                      ? '処理中...'
                      : authMode === 'signup'
                      ? 'メールアドレスで会員登録'
                      : 'メールアドレスでログイン'}
                  </button>
                </form>
            </div>
            )}

            {session?.user ? (
              <>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-start gap-4 border-b border-slate-100 pb-4">
                <div className="relative group">
                  <AvatarIcon url={avatarUrl} nickname={nickname} size="lg" />
                  <label className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow-md cursor-pointer transition-transform hover:scale-110">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1.5 flex-1">
                  <h2 className="font-bold text-base">{nickname || '未設定ユーザー'}</h2>

                  {bio && <p className="text-xs text-slate-600 whitespace-pre-wrap">{bio}</p>}

                  {myApprovedQuals.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {myApprovedQuals.map((q) => (
                        <span
                          key={q.id}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          {q.qualification_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">承認された資格はまだありません</p>
                  )}
                </div>
              </div>

              {uploadingAvatar && <p className="text-xs text-indigo-600 font-semibold">アイコン画像をアップロード中...</p>}

              {myPendingQuals.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-1">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    審査中の資格 ({myPendingQuals.length}件)
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {myPendingQuals.map((q) => (
                      <span key={q.id} className="text-[11px] bg-amber-100/80 text-amber-800 px-2 py-0.5 rounded font-medium">
                        {q.qualification_name} (確認中)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowProfileEdit((prev) => !prev)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                {showProfileEdit ? 'プロフィール編集を閉じる' : 'プロフィールを編集'}
              </button>

              {showProfileEdit && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ニックネーム</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="例: けん"
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">自己紹介（1〜2文程度）</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="例: 住宅会社で一級建築士として働いています。気軽に相談してください！"
                    rows={2}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                      SNS・外部URL（最大3件まで）
                    </label>
                    {userUrls.length < 3 && (
                      <button
                        type="button"
                        onClick={addUrlField}
                        className="text-[11px] text-indigo-600 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> URLを追加
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {userUrls.map((url, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => handleUrlChange(idx, e.target.value)}
                          placeholder={`URL ${idx + 1} (Instagram, X, TikTokなど)`}
                          className="flex-1 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {userUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUrlField(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? '保存中...' : 'プロフィール情報を保存する'}
                </button>
              </div>
              )}

              <button
                type="button"
                onClick={() => setShowQualApply((prev) => !prev)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                {showQualApply ? '資格申請を閉じる' : '資格を申請'}
              </button>

              {showQualApply && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-xs text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-indigo-600" />
                  新しい資格を申請する
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">申請する資格</label>
                  <select
                    value={selectedQualification}
                    onChange={(e) => setSelectedQualification(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    {QUALIFICATION_OPTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    資格証の写真（免許証・免状）を選択
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCertFileChange}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 px-2 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                  />

                  {certPreviewUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-white p-1">
                      <img src={certPreviewUrl} alt="証明書プレビュー" className="w-full h-auto max-h-36 object-contain" />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleApplyQualification}
                  disabled={submittingCert}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingCert ? '送信中...' : `「${selectedQualification}」の免状を添えて申請する`}
                </button>
              </div>
              )}
            </div>

            {/* マイページの自分の投稿一覧 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                自分の投稿一覧 ({myPosts.length}件)
              </h3>

              {myPosts.length === 0 ? (
                <p className="text-xs text-slate-400">投稿した間取りはまだありません。</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {myPosts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPost(p)
                        setReplyTarget(null)
                      }}
                      className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-slate-300 relative group bg-slate-50"
                    >
                      <img
                        src={p.image_urls[0]}
                        alt="自分の投稿"
                        className="w-full h-32 object-cover"
                      />
                      {p.image_urls.length > 1 && (
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          1/{p.image_urls.length}
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDeletePost(p.id, p.image_urls, e)}
                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                        title="この投稿を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-600 truncate min-w-0">
                <span className="font-bold text-slate-800">{session.user.email}</span>
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                ログアウト
              </button>
            </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 text-center px-2">
                ログインすると、自分のプロフィール・投稿・いいねを管理できます。
              </p>
            )}

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <button
                type="button"
                onClick={() => setShowContactForm((prev) => !prev)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                {showContactForm ? 'お問い合わせを閉じる' : 'お問い合わせ'}
              </button>
              {showContactForm && (
                <>
              <p className="text-xs text-slate-500">
                ログインしなくても送れます。送信するとメールアプリが開き、宛先は {CONTACT_EMAIL} です。
              </p>
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">お名前</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="お名前"
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">返信先メールアドレス</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">お問い合わせ内容</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="ご質問・ご意見をご記入ください"
                    rows={4}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {contactNotice && <p className="text-xs text-emerald-700 font-medium">{contactNotice}</p>}
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  メールで送信する
                </button>
              </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 個人情報確認ダイアログ (z-50) */}
      {showPrivacyConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-amber-600 pb-2 border-b border-amber-100">
              <AlertTriangle className="w-6 h-6 shrink-0 text-amber-500" />
              <h3 className="font-bold text-base text-slate-800">画像投稿前の個人情報確認</h3>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-amber-900 text-sm">
                投稿する画像に個人情報が映り込んでいませんか？
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>
                  <strong className="text-slate-800">お名前・ご住所・電話番号</strong>（建築主欄、名刺など）
                </li>
                <li>
                  <strong className="text-slate-800">敷地住所・周辺地図・地番</strong>
                </li>
              </ul>
              <p className="text-[11px] text-amber-800 pt-1">
                ※不適切な情報が含まれている場合は、トリミングやモザイク処理を行ってから投稿してください。
              </p>
            </div>

            {/* 送信予定の画像プレビュー */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">投稿画像のプレビュー ({previewUrls.length}枚)</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {previewUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`確認画像 ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setShowPrivacyConfirm(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                戻る（確認・修正）
              </button>
              <button
                onClick={handleUpload}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                確認して投稿する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投稿詳細モーダル (z-50) */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col my-auto">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <AvatarIcon
                  url={selectedPost.avatar_url}
                  nickname={selectedPost.nickname}
                  size="sm"
                  onClick={(e) =>
                    openUserProfile(
                      {
                        nickname: selectedPost.nickname || '匿名ユーザー',
                        avatar_url: selectedPost.avatar_url,
                        user_urls: selectedPost.user_urls,
                        bio: selectedPost.bio,
                      },
                      e
                    )
                  }
                />
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openUserProfile(
                        {
                          nickname: selectedPost.nickname || '匿名ユーザー',
                          avatar_url: selectedPost.avatar_url,
                          user_urls: selectedPost.user_urls,
                          bio: selectedPost.bio,
                        },
                        e
                      )
                    }}
                    className="font-bold text-xs text-slate-800 hover:underline cursor-pointer block"
                  >
                    {selectedPost.nickname || '匿名ユーザー'}
                  </button>
                  <p className="text-[10px] text-slate-400">
                    {new Date(selectedPost.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedPost.nickname === nickname && (
                  <button
                    onClick={(e) => handleDeletePost(selectedPost.id, selectedPost.image_urls, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="投稿を削除"
                  >
                    <Trash2 className="w-5 h-5 text-rose-500" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              <ImageCarousel images={selectedPost.image_urls} />

              <PostMetaTags post={selectedPost} />

              {selectedPost.comment && (
                <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedPost.comment}
                </p>
              )}

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                  コメント ({comments[selectedPost.id]?.length || 0})
                </h3>

                <div className="space-y-2.5">
                  {(comments[selectedPost.id] || [])
                    .filter((c) => !c.parent_id)
                    .map((parentComment) => {
                      const childComments = (comments[selectedPost.id] || []).filter(
                        (c) => c.parent_id === parentComment.id
                      )
                      const isExpanded = expandedCommentIds.includes(parentComment.id)

                      return (
                        <div key={parentComment.id} className="space-y-2">
                          {renderCommentBox(parentComment)}

                          {childComments.length > 0 && (
                            <button
                              onClick={() => toggleReplyExpand(parentComment.id)}
                              className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold pt-0.5 ml-2 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>返信を非表示</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>返信 {childComments.length} 件</span>
                                </>
                              )}
                            </button>
                          )}

                          {isExpanded && childComments.length > 0 && (
                            <div className="ml-5 space-y-2 border-l-2 border-indigo-100 pl-2">
                              {childComments.map((child) => (
                                <div key={child.id}>{renderCommentBox(child, true)}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-white space-y-2">
              {replyTarget && (
                <div className="flex items-center justify-between text-xs bg-indigo-50 text-indigo-700 p-1.5 px-3 rounded-lg">
                  <span className="truncate">「{replyTarget.nickname}」さんへ返信中</span>
                  <button onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={modalCommentInput}
                  onChange={(e) => setModalCommentInput(e.target.value)}
                  placeholder={replyTarget ? '返信を入力...' : 'コメントを入力...'}
                  className="flex-1 p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddModalComment(selectedPost.id)
                  }}
                />
                <button
                  onClick={() => handleAddModalComment(selectedPost.id)}
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* プロフィール閲覧ポップアップ (z-60) */}
      {viewUserProfile && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl p-5 space-y-4 text-center relative">
            <button
              onClick={() => setViewUserProfile(null)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-2 pt-2">
              <AvatarIcon
                url={viewUserProfile.avatar_url}
                nickname={viewUserProfile.nickname}
                size="lg"
              />
              <h3 className="font-bold text-lg text-slate-800">{viewUserProfile.nickname}</h3>

              {getApprovedQualsForUser(viewUserProfile.nickname).length > 0 && (
                <div className="flex flex-wrap justify-center gap-1">
                  {getApprovedQualsForUser(viewUserProfile.nickname).map((q, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {q}
                    </span>
                  ))}
                </div>
              )}

              {/* 自己紹介表示 */}
              {viewUserProfile.bio && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 w-full whitespace-pre-wrap mt-1">
                  {viewUserProfile.bio}
                </p>
              )}
            </div>

            {/* URL表示 (最大3件) */}
            {Array.isArray(viewUserProfile.user_urls) && viewUserProfile.user_urls.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {viewUserProfile.user_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-3 rounded-lg text-xs transition-colors border border-indigo-100 truncate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            )}

            {viewUserProfile.nickname !== nickname && (
              <button
                type="button"
                onClick={(e) => openChatWith(viewUserProfile.nickname, e)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                メッセージ
              </button>
            )}

            <div className="text-left pt-2 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {viewUserProfile.nickname} さんの投稿一覧
              </p>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                {posts
                  .filter((p) => p.nickname === viewUserProfile.nickname)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPost(p)
                        setViewUserProfile(null)
                      }}
                      className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-80"
                    >
                      <img src={p.image_urls[0]} alt="投稿" className="w-full h-full object-cover" />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="grid grid-cols-5 items-center py-2 w-full">
          <button
            onClick={goToHome}
            className={`flex flex-col items-center justify-center gap-1 text-xs cursor-pointer ${
              activeTab === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Home className="w-5 h-5" />
            ホーム
          </button>
          <button
            onClick={goToSearch}
            className={`flex flex-col items-center justify-center gap-1 text-xs cursor-pointer ${
              activeTab === 'search' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Search className="w-5 h-5" />
            検索
          </button>
          <button
            onClick={goToMessages}
            className={`flex flex-col items-center justify-center gap-1 text-xs cursor-pointer ${
              activeTab === 'messages' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            メッセージ
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center justify-center gap-1 text-xs cursor-pointer ${
              activeTab === 'favorites' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Heart className="w-5 h-5" />
            お気に入り
          </button>
          <button
            onClick={() => setActiveTab('mypage')}
            className={`flex flex-col items-center justify-center gap-1 text-xs cursor-pointer ${
              activeTab === 'mypage' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <User className="w-5 h-5" />
            マイページ
          </button>
        </div>
      </nav>
    </div>
  )
}