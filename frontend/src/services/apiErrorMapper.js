const isNetworkError = (error) => {
  const message = (error?.message || '').toLowerCase()
  return error?.status === 0 || message.includes('failed to fetch') || message.includes('network')
}

export const mapApiError = (error, context = 'default') => {
  if (isNetworkError(error)) {
    return 'Impossible de joindre le serveur. Vérifiez que le backend est démarré.'
  }

  const status = error?.status

  if (status === 401) {
    if (context === 'login') {
      return 'Email ou mot de passe incorrect.'
    }

    if (context === 'register') {
      return 'Session invalide pendant l\'inscription. Veuillez réessayer.'
    }

    return 'Session expirée. Veuillez vous reconnecter.'
  }

  if (status === 403) {
    return 'Accès refusé pour ce compte.'
  }

  if (status === 422) {
    if (context === 'register') {
      return 'Inscription invalide. Vérifiez les champs du formulaire.'
    }

    if (context === 'login') {
      return 'Connexion invalide. Vérifiez votre email et mot de passe.'
    }

    return 'Données invalides. Vérifiez votre saisie.'
  }

  if (status === 409) {
    return 'Conflit détecté: cette action a déjà été effectuée.'
  }

  if (status === 429) {
    return 'Trop de tentatives. Réessayez dans quelques instants.'
  }

  if (status >= 500) {
    return 'Erreur serveur. Réessayez plus tard.'
  }

  return error?.message || 'Une erreur est survenue.'
}

export const mapValidationErrors = (details) => {
  if (!details || typeof details !== 'object') {
    return []
  }

  return Object.entries(details).flatMap(([field, messages]) => {
    if (Array.isArray(messages)) {
      return messages.map((message) => `${field}: ${message}`)
    }

    if (typeof messages === 'string') {
      return [`${field}: ${messages}`]
    }

    return []
  })
}

