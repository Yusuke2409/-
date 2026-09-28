export type Post = {
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
  user_email?: string
  floor_area_min?: number | null
  floor_area_max?: number | null
}

export type Comment = {
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
  user_id?: string
  user_email?: string
}

export type UserQualification = {
  id: number
  created_at: string
  nickname: string
  qualification_name: string
  cert_image_url?: string
  status: 'pending' | 'approved' | 'rejected'
  user_id?: string
  user_email?: string
}

export type UserProfileView = {
  nickname: string
  avatar_url?: string
  user_urls?: string[]
  bio?: string
  user_id?: string
  user_email?: string
}

export type ChatMessage = {
  id: number
  created_at: string
  sender_nickname: string
  recipient_nickname: string
  sender_id?: string
  content: string
  image_url?: string
}
