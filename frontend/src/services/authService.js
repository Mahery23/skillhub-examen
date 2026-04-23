import { apiRequest } from './apiClient'

const TOKEN_KEY = 'skillhub_token'
const USER_KEY = 'skillhub_user'

const ALLOWED_ROLES = ['admin', 'formateur', 'apprenant']
const MAX_FIELD_LENGTH = 255
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

const sanitizeString = (value, maxLength = MAX_FIELD_LENGTH) => {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLength)
}

const sanitizeRole = (value) => {
  const role = typeof value === 'string' ? value.toLowerCase() : ''
  return ALLOWED_ROLES.includes(role) ? role : 'apprenant'
}

const sanitizeToken = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return JWT_REGEX.test(trimmed) ? trimmed : null
}

const sanitizeId = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value)) return value
  return null
}

const normalizeUser = (rawUser = {}, fallback = {}) => ({
  id: sanitizeId(rawUser.id ?? fallback.id),
  prenom: sanitizeString(rawUser.prenom || fallback.prenom),
  nom: sanitizeString(rawUser.nom || fallback.nom),
  contact: sanitizeString(rawUser.contact || fallback.contact),
  name: sanitizeString(
    rawUser.name
      || [rawUser.prenom, rawUser.nom].filter(Boolean).join(' ')
      || fallback.name
      || 'Utilisateur'
  ),
  email: sanitizeString(rawUser.email || fallback.email),
  role: sanitizeRole(rawUser.role || rawUser.role_name || fallback.role),
})

const buildSafeUserPayload = (user = {}) => ({
  id: sanitizeId(user.id),
  prenom: sanitizeString(user.prenom),
  nom: sanitizeString(user.nom),
  contact: sanitizeString(user.contact),
  name: sanitizeString(user.name),
  email: sanitizeString(user.email),
  role: sanitizeRole(user.role),
})

const saveSession = ({ token, user }) => {
  const safeToken = sanitizeToken(token)
  if (safeToken) {
    localStorage.setItem(TOKEN_KEY, safeToken)
  }
  const safeUserPayload = buildSafeUserPayload(user)
  localStorage.setItem(USER_KEY, JSON.stringify(safeUserPayload))
}

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/**
 * Calcule le HMAC-SHA256 du message avec le mot de passe comme clé.
 * Utilise l'API Web Crypto native du navigateur.
 */
const computeHmac = async (password, message) => {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(password)
  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

  // Convertir en hex (même format que HmacService.java)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Login HMAC en 2 étapes :
 * 1. GET /api/challenge → nonce
 * 2. Calcul HMAC + POST /api/login → JWT
 */
const loginWithApi = async ({ email, password }) => {
  // Étape 1 : récupérer le nonce
  const challengePayload = await apiRequest(`/api/challenge?email=${encodeURIComponent(email)}`)
  const nonce = challengePayload?.nonce
  if (!nonce) {
    throw new Error('Impossible de récupérer le challenge.')
  }

  // Étape 2 : calculer le HMAC
  const timestamp = Math.floor(Date.now() / 1000)
  const message = `${email}:${nonce}:${timestamp}`
  const hmac = await computeHmac(password, message)

  // Étape 3 : envoyer la preuve HMAC
  const payload = await apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, nonce, timestamp, hmac }),
  })

  // Spring Boot retourne { accessToken, expiresAt }
  const token = payload?.accessToken || payload?.token || payload?.access_token
  if (!token) {
    throw new Error('Token JWT manquant dans la reponse login.')
  }

  // Décoder le JWT pour récupérer name et role (pas besoin de vérifier la signature côté client)
  let userFromJwt = {}
  try {
    const base64Payload = token.split('.')[1]
    const decoded = JSON.parse(atob(base64Payload))
    userFromJwt = {
      email: decoded.sub,
      role: decoded.role,
      name: decoded.name,
    }
  } catch {
    userFromJwt = { email }
  }

  const user = normalizeUser(userFromJwt, { email })
  const session = { token, user, mode: 'api' }
  saveSession(session)

  return session
}

/**
 * Inscription : envoie les infos au Laravel qui les transmet au auth-service.
 * Pas de token retourné — l'utilisateur doit se connecter après.
 */
const registerWithApi = async ({ prenom, nom, contact, email, password, role }) => {
  await apiRequest('/api/register', {
    method: 'POST',
    body: JSON.stringify({ prenom, nom, contact, email, password, role }),
  })

  // Pas de token après register — retourner un objet minimal
  const user = normalizeUser({
    prenom,
    nom,
    contact,
    name: [prenom, nom].filter(Boolean).join(' '),
    email,
    role,
  })

  return { user, mode: 'api' }
}

export const getStoredUser = () => {
  const rawUser = localStorage.getItem(USER_KEY)
  if (!rawUser) return null
  try {
    return normalizeUser(JSON.parse(rawUser))
  } catch {
    clearSession()
    return null
  }
}

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY)

export const getProfile = async () => {
  const token = getStoredToken()
  if (!token) return null

  const payload = await apiRequest('/api/profile', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const user = normalizeUser(payload?.user || payload)
  saveSession({ token, user })
  return user
}

export const login = async (credentials) => loginWithApi(credentials)

export const register = async (payload) => registerWithApi(payload)

export const logout = () => {
  clearSession()
}