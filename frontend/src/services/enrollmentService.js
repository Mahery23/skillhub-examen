import { apiRequest } from './apiClient'
import { getStoredToken } from './authService'

const authHeaders = () => {
  const token = getStoredToken()

  if (!token) {
    throw new Error('Utilisateur non connecté.')
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

const mapEnrollmentItem = (item = {}) => ({
  enrollment_id: item.enrollment_id ?? item.id ?? null,
  progression: item.progression ?? 0,
  date_inscription: item.date_inscription || null,
  formation: item.formation || null,
})

export const getMyFormations = async () => {
  const payload = await apiRequest('/api/apprenant/formations', {
    headers: authHeaders(),
  })

  const items = Array.isArray(payload?.formations)
    ? payload.formations
    : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []))

  return items.map(mapEnrollmentItem)
}

export const enrollInFormation = async (formationId) => {
  return apiRequest(`/api/formations/${formationId}/inscription`, {
    method: 'POST',
    headers: authHeaders(),
  })
}

export const unenrollFromFormation = async (formationId) => {
  return apiRequest(`/api/formations/${formationId}/inscription`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}


