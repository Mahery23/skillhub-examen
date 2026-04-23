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

export const getFormationModules = async (formationId) => {
  const payload = await apiRequest(`/api/formations/${formationId}/modules`)
  
  if (Array.isArray(payload?.modules)) {
    return payload.modules
  }
  
  return []
}

export const createModule = async (formationId, data) => {
  const payload = await apiRequest(`/api/formations/${formationId}/modules`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })

  if (payload?.module) {
    return payload.module
  }

  throw new Error(payload?.message || 'Erreur lors de la création du module.')
}

export const updateModule = async (moduleId, data) => {
  const payload = await apiRequest(`/api/modules/${moduleId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })

  if (payload?.module) {
    return payload.module
  }

  throw new Error(payload?.message || 'Erreur lors de la modification du module.')
}

export const deleteModule = async (moduleId) => {
  const payload = await apiRequest(`/api/modules/${moduleId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  return payload
}

