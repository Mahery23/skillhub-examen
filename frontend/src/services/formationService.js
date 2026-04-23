import { apiRequest } from './apiClient'

const normalizeArrayPayload = (payload, key) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.[key])) return payload[key]
  return []
}

export const getFormations = async ({ recherche = '', categorie = '', niveau = '' } = {}) => {
  const params = new URLSearchParams()

  if (recherche) params.append('search', recherche)
  if (categorie && categorie !== 'Toutes') params.append('categorie', categorie)
  if (niveau && niveau !== 'Tous') params.append('niveau', niveau)

  const query = params.toString() ? `?${params.toString()}` : ''
  const payload = await apiRequest(`/api/formations${query}`)

  return normalizeArrayPayload(payload, 'data')
}

export const getFormation = async (id) => {
  const payload = await apiRequest(`/api/formations/${id}`)
  if (payload?.formation) return payload.formation
  return payload || null
}

export const getFormationModules = async (id) => {
  const payload = await apiRequest(`/api/formations/${id}/modules`)
  return normalizeArrayPayload(payload, 'modules')
}


