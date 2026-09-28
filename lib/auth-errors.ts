export function authErrorJa(raw: string) {
  const text = raw || '不明なエラーです'
  const lower = text.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'メールアドレスまたはパスワードが正しくありません。'
  if (lower.includes('email not confirmed')) return 'メールアドレスの確認が完了していません。届いたメールのリンクを開いてください。'
  if (lower.includes('user not found')) return 'このメールアドレスのアカウントは見つかりませんでした。'
  if (lower.includes('over_email_send_rate_limit') || lower.includes('rate limit')) {
    return 'メールの送信上限に達しました。しばらく待ってから再度お試しください。'
  }
  if (lower.includes('expired') || lower.includes('otp_expired') || lower.includes('access denied')) {
    return 'リンクの有効期限が切れているか、無効です。もう一度パスワード再設定メールを送信してください。'
  }
  if (lower.includes('same_password') || lower.includes('same password') || lower.includes('should be different')) {
    return '現在と同じパスワードは使えません。別のパスワードを設定してください。'
  }
  if (lower.includes('password should be at least') || lower.includes('weak')) {
    return 'パスワードは6文字以上で、推測されにくいものにしてください。'
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'メールアドレスの形式が正しくありません。'
  }
  if (lower.includes('error sending') && lower.includes('email')) {
    return 'メールを送信できませんでした。しばらく待ってから再度お試しください。'
  }
  return text
}
