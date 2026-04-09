import { resolveAssetUrl } from '@/services/api'

export const DEFAULT_AVATAR_URL = '/avatar-placeholder.svg'
export const DEFAULT_LOGO_URL = '/brand-mark.svg'

export function getAvatarImageSource(url) {
  return resolveAssetUrl(url) || DEFAULT_AVATAR_URL
}

export function handleImageFallback(event, fallbackUrl) {
  const target = event.currentTarget
  if (!target) {
    return
  }

  if (target.dataset.fallbackApplied === 'true') {
    return
  }

  target.dataset.fallbackApplied = 'true'
  target.src = fallbackUrl
}
