const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

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

  if (API_BASE_URL && (url.startsWith('/backend/') || url.startsWith('/public/') || url.startsWith('/uploads/'))) {
    return `${API_BASE_URL}${url}`
  }

  return url
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export async function request(url, options = {}) {
  const response = await fetch(resolveAssetUrl(url), {
    credentials: 'include',
    ...options,
    headers: {
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

  return data
}
