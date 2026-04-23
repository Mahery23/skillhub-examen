import { apiRequest } from './apiClient'

const TOKEN_KEY = 'skillhub_token'
const USER_KEY = 'skillhub_user'

// Allowlist des roles. Toute valeur hors liste tombe sur 'apprenant'.
// Sans ca, une API compromise pourrait stocker role='admin' cote client.
const ALLOWED_ROLES = ['admin', 'formateur', 'apprenant']

// Limite defensive : evite qu'une API compromise sature le localStorage.
const MAX_FIELD_LENGTH = 255

// Un JWT est strictement 3 segments base64url separes par '.'.
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

const sanitizeString = (value, maxLength = MAX_FIELD_LENGTH) => {
  if (typeof value !== 'string') return ''
  // eslint-disable-next-line no-control-regex
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

// Construit un payload dont TOUS les champs ressortent a nouveau des
// sanitizers juste avant l ecriture. Meme si `user` vient deja de
// normalizeUser, on re-sanitize a la frontiere du sink localStorage pour
// que l analyse taint de SonarCloud voit un chemin sanitize explicite
// (regle jssecurity:S8475 "Browser storage should not be poisoned").
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
  // Validation AVANT ecriture dans browser storage (Sonar jssecurity:S8475).
  const safeToken = sanitizeToken(token)
  if (safeToken) {
    localStorage.setItem(TOKEN_KEY, safeToken)
  }

  // Re-sanitize juste avant l ecriture pour que l analyse statique
  // reconnaisse le chemin tainted -> sanitize -> sink.
  const safeUserPayload = buildSafeUserPayload(user)
  localStorage.setItem(USER_KEY, JSON.stringify(safeUserPayload))
}

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const loginWithApi = async ({ email, password }) => {
  const payload = await apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  const token = payload?.token || payload?.access_token
  const user = normalizeUser(payload?.user, { email })

  if (!token) {
    throw new Error('Token JWT manquant dans la reponse login.')
  }

  const session = { token, user, mode: 'api' }
  saveSession(session)

  return session
}

const registerWithApi = async ({ prenom, nom, contact, email, password, role }) => {
  const payload = await apiRequest('/api/register', {
    method: 'POST',
    body: JSON.stringify({ prenom, nom, contact, email, password, role }),
  })

  const token = payload?.token || payload?.access_token
  const user = normalizeUser(payload?.user, {
    prenom,
    nom,
    contact,
    name: [prenom, nom].filter(Boolean).join(' '),
    email,
    role,
  })

  if (!token) {
    throw new Error('Token JWT manquant dans la reponse register.')
  }

  const session = { token, user, mode: 'api' }
  saveSession(session)

  return session
}

export const getStoredUser = () => {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

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

  if (!token) {
    return null
  }

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



