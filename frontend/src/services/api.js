const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const AUTH_TOKEN_STORAGE_KEY = 'UTZM_AUTH_TOKEN'

function isAbsoluteUrl(value) {
  return /^(?:[a-z]+:)?\/\//i.test(value)
}

export function resolveAssetUrl(url) {
  if (!url) {
    return url
  }

  if (isAbsoluteUrl(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`

  if (API_BASE_URL && /^(\/(?:backend|public|uploads)\/)/.test(normalizedUrl)) {
    return `${API_BASE_URL}${normalizedUrl}`
  }

  return normalizedUrl
}

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

export function setAuthToken(token) {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  }
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export async function request(url, options = {}) {
  const token = getAuthToken()
  const response = await fetch(resolveAssetUrl(url), {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  })

  const data = await parseJson(response)
  if (!response.ok || data.error) {
    const error = new Error(data.error ?? 'No se pudo completar la operacion.')
    error.data = data
    error.status = response.status
    throw error
  }

  if (typeof data.token === 'string' && data.token) {
    setAuthToken(data.token)
  }

  return data
}
