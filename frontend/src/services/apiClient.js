const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const SHOULD_LOG_API_ERRORS = import.meta.env.DEV || import.meta.env.VITE_DEBUG_API === 'true'

const logApiError = ({ type, path, method, status, message, payload }) => {
  if (!SHOULD_LOG_API_ERRORS) {
    return
  }

  console.error('[SkillHub API Error]', {
    type,
    method,
    path,
    url: buildUrl(path),
    status: status ?? null,
    message,
    payload: payload ?? null,
    timestamp: new Date().toISOString(),
  })
}

const buildUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${API_BASE_URL}${normalizedPath}`
}

export const parseJson = async (response) => {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export const apiRequest = async (path, options = {}) => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL manquant.')
  }

  const { headers: customHeaders = {}, ...restOptions } = options
  const method = typeof restOptions?.method === 'string' ? restOptions.method.toUpperCase() : 'GET'

  let response

  try {
    response = await fetch(buildUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...customHeaders,
      },
      ...restOptions,
    })
  } catch {
    const networkError = new Error('Failed to fetch')
    networkError.status = 0
    logApiError({
      type: 'network',
      path,
      method,
      status: 0,
      message: networkError.message,
    })
    throw networkError
  }

  const payload = await parseJson(response)

  if (response.redirected) {
    const redirectError = new Error('Redirection inattendue détectée. Veuillez vous reconnecter.')
    redirectError.status = response.status || 0
    logApiError({
      type: 'redirect',
      path,
      method,
      status: redirectError.status,
      message: redirectError.message,
      payload,
    })
    throw redirectError
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('skillhub_token')
      localStorage.removeItem('skillhub_user')
    }

    const error = new Error(payload?.message || 'Une erreur est survenue.')

    if (payload?.errors && typeof payload.errors === 'object') {
      error.details = payload.errors
    }

    error.status = response.status
    logApiError({
      type: 'http',
      path,
      method,
      status: error.status,
      message: error.message,
      payload,
    })
    throw error
  }

  return payload
}

export { API_BASE_URL }

