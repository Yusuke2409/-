'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
} from 'lucide-react'

type Post = {
  id: number
  created_at: string
  image_urls: string[]
  doc_type: string
  layout?: string
  floors?: string
  comment: string
  nickname?: string
  avatar_url?: string
  user_urls?: string[]
  bio?: string
  likes_count?: number
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
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'favorites' | 'mypage'>('home')
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

  // プロフィール状態
  const [nickname, setNickname] = useState('けん')
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
  const [docType, setDocType] = useState('平面図')
  const [layout, setLayout] = useState('1LDK')
  const [floors, setFloors] = useState('平屋')
  const [comment, setComment] = useState('')
  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false) // 個人情報確認ダイアログ制御

  // 検索フィルター
  const [searchDocType, setSearchDocType] = useState('すべて')
  const [searchLayout, setSearchLayout] = useState('すべて')
  const [searchFloors, setSearchFloors] = useState('すべて')

  useEffect(() => {
    fetchUserProfile()
    fetchPosts()
    fetchQualifications()
    fetchComments()
  }, [])

  useEffect(() => {
    applyFilter()
  }, [posts, searchDocType, searchLayout, searchFloors])

  const fetchUserProfile = async () => {
    const savedNick = localStorage.getItem('my_nickname') || 'けん'
    setNickname(savedNick)

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', savedNick)
      .single()

    if (!error && data) {
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      if (data.bio) setBio(data.bio)
      if (data.user_urls && Array.isArray(data.user_urls) && data.user_urls.length > 0) {
        setUserUrls(data.user_urls)
      } else if (data.user_url) {
        setUserUrls([data.user_url])
      }
    }
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
    if (!nickname.trim()) return alert('ニックネームを入力してください')
    setSavingProfile(true)

    const filteredUrls = userUrls.map((u) => u.trim()).filter(Boolean).slice(0, 3)

    try {
      localStorage.setItem('my_nickname', nickname.trim())

      const { error } = await supabase.from('users').upsert([
        {
          nickname: nickname.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim(),
          user_urls: filteredUrls,
          updated_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      alert('プロフィール情報を保存しました！')
      fetchPosts()
      fetchComments()
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

  const fetchPosts = async () => {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('id', { ascending: false })

    const { data: usersData } = await supabase.from('users').select('*')
    const { data: likesData } = await supabase.from('likes').select('post_id')

    if (postsError) return

    const usersMap: { [nick: string]: any } = {}
    if (usersData) {
      usersData.forEach((u) => {
        usersMap[u.nickname] = u
      })
    }

    const likeCounts: { [key: number]: number } = {}
    const userLikedIds: number[] = []

    if (likesData) {
      likesData.forEach((like) => {
        likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1
        if (!userLikedIds.includes(like.post_id)) {
          userLikedIds.push(like.post_id)
        }
      })
    }

    const formattedPosts = (postsData || []).map((post) => {
      const u = usersMap[post.nickname]
      return {
        ...post,
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

    setFilteredPosts(result)
  }

  const handleToggleLike = async (postId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    const isLiked = likedPostIds.includes(postId)

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId)
    } else {
      await supabase.from('likes').insert([{ post_id: postId }])
    }

    fetchPosts()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    setSelectedFiles(files)

    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      fetchPosts()
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
    if (selectedFiles.length === 0) return alert('画像を少なくとも1枚選択してください')
    setShowPrivacyConfirm(true)
  }

  // 確認後に実際にアップロードを実行する関数
  const handleUpload = async () => {
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

      const { error: insertError } = await supabase.from('posts').insert([
        {
          image_urls: uploadedUrls,
          image_url: uploadedUrls[0],
          doc_type: docType,
          layout: layout,
          floors: floors,
          comment: comment,
          nickname: nickname,
          avatar_url: avatarUrl,
          bio: bio,
          user_urls: filteredUrls,
        },
      ])

      if (insertError) throw insertError

      setSelectedFiles([])
      setPreviewUrls([])
      setComment('')
      alert('投稿が完了しました！')
      fetchPosts()
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
      fetchPosts()
    } catch (error: any) {
      alert('削除エラー: ' + error.message)
    }
  }

  const handleCommentReaction = (commentId: number, type: 'like' | 'dislike') => {
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

    try {
      const filteredUrls = userUrls.map((u) => u.trim()).filter(Boolean).slice(0, 3)

      const insertData: any = {
        post_id: postId,
        nickname: nickname,
        avatar_url: avatarUrl,
        bio: bio,
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

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', user.nickname)
      .single()

    if (data) {
      setViewUserProfile({
        nickname: data.nickname,
        avatar_url: data.avatar_url || user.avatar_url,
        bio: data.bio || user.bio,
        user_urls: data.user_urls || (data.user_url ? [data.user_url] : user.user_urls || []),
      })
    } else {
      setViewUserProfile(user)
    }
  }

  const myApprovedQuals = allUserQuals.filter((q) => q.nickname === nickname && q.status === 'approved')
  const myPendingQuals = allUserQuals.filter((q) => q.nickname === nickname && q.status === 'pending')

  const favoritePosts = posts.filter((post) => likedPostIds.includes(post.id))
  const myPosts = posts.filter((post) => post.nickname === nickname)

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
              onClick={(e) =>
                openUserProfile({ nickname: c.nickname, avatar_url: c.avatar_url, user_urls: c.user_urls, bio: c.bio }, e)
              }
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                openUserProfile({ nickname: c.nickname, avatar_url: c.avatar_url, user_urls: c.user_urls, bio: c.bio }, e)
              }}
              className="font-bold text-xs text-slate-800 hover:underline cursor-pointer"
            >
              {c.nickname}
            </button>
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
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm text-center flex justify-between items-center">
        <h1 className="text-lg font-bold text-slate-800 mx-auto">間取り相談掲示板</h1>
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
                    <option value="平屋">平屋</option>
                    <option value="2階建">2階建</option>
                    <option value="3階建">3階建</option>
                    <option value="それ以上">それ以上</option>
                  </select>
                </div>
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

                    <div className="px-3 flex gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                        {post.doc_type}
                      </span>
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
                    </div>

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

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">図面種類</label>
                  <select
                    value={searchDocType}
                    onChange={(e) => setSearchDocType(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white"
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
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white"
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
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="すべて">すべて</option>
                    <option value="平屋">平屋</option>
                    <option value="2階建">2階建</option>
                    <option value="3階建">3階建</option>
                    <option value="それ以上">それ以上</option>
                  </select>
                </div>
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
                        <span className="flex items-center gap-1">
                          <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                          {post.likes_count || 0}
                        </span>
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

            {favoritePosts.length === 0 ? (
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

        {/* マイページタブ */}
        {activeTab === 'mypage' && (
          <div className="space-y-4">
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

              {/* プロフィール編集 */}
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

              {/* 資格申請 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-4">
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
                  <strong className="text-slate-800">会社名・担当者名</strong>（ハウスメーカー・工務店）
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

              <div className="flex gap-1.5 flex-wrap">
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {selectedPost.doc_type}
                </span>
                {selectedPost.layout && (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {selectedPost.layout}
                  </span>
                )}
                {selectedPost.floors && (
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {selectedPost.floors}
                  </span>
                )}
              </div>

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
            {viewUserProfile.user_urls && viewUserProfile.user_urls.length > 0 && (
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 max-w-lg mx-auto">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 text-xs cursor-pointer ${
              activeTab === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Home className="w-5 h-5" />
            ホーム
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center gap-1 text-xs cursor-pointer ${
              activeTab === 'search' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Search className="w-5 h-5" />
            検索
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center gap-1 text-xs cursor-pointer ${
              activeTab === 'favorites' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Heart className="w-5 h-5" />
            お気に入り
          </button>
          <button
            onClick={() => setActiveTab('mypage')}
            className={`flex flex-col items-center gap-1 text-xs cursor-pointer ${
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