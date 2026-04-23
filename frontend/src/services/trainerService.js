import { apiRequest } from './apiClient'
import { getStoredToken, getStoredUser } from './authService'

const authHeaders = () => {
  const token = getStoredToken()

  if (!token) {
    throw new Error('Utilisateur non connecté.')
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

const normalizeFormation = (formation = {}) => ({
  id: formation.id ?? null,
  titre: formation.titre || '',
  description: formation.description || formation.mini_description || '',
  categorie: formation.categorie || '',
  niveau: formation.niveau || 'Débutant',
  formateur: formation.formateur || null,
  formateur_id: formation.formateur?.id ?? formation.formateur_id ?? null,
  apprenants: formation.apprenants ?? formation.inscriptions_count ?? 0,
  vues: formation.vues ?? formation.nombre_de_vues ?? 0,
  date_creation: formation.date_creation || null,
})

export const getMyFormations = async () => {
  const payload = await apiRequest('/api/formations')
  const currentUser = getStoredUser()
  let formations = []

  if (Array.isArray(payload?.data)) {
    formations = payload.data
  } else if (Array.isArray(payload)) {
    formations = payload
  }

  if (!currentUser?.id) {
    return formations.map(normalizeFormation)
  }

  return formations
    .filter((formation) => String(formation?.formateur?.id ?? formation?.formateur_id ?? '') === String(currentUser.id))
    .map(normalizeFormation)
}

export const createFormation = async (data) => {
  const payload = await apiRequest('/api/formations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })

  return normalizeFormation(payload?.formation || {})
}

export const updateFormation = async (formationId, data) => {
  const payload = await apiRequest(`/api/formations/${formationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })

  return normalizeFormation(payload?.formation || {})
}

export const deleteFormation = async (formationId) => {
  return apiRequest(`/api/formations/${formationId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}


