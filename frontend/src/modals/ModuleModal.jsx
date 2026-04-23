import { Modal, Button, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'

// Libelle du bouton de sauvegarde (creation vs edition, avec etat "en cours").
// Extrait hors du composant pour eviter un ternaire imbrique signale par Sonar.
const getSaveButtonLabel = (isSaving, isEditing) => {
  if (isSaving) return isEditing ? 'Modification...' : 'Création...'
  return isEditing ? 'Enregistrer' : 'Ajouter'
}

function ModuleModal({ show, onHide, onSave, module, isSaving, error, formationModules }) {
  const moduleCountInFormation = formationModules ? formationModules.length : 0
  const isEditing = module?.id
  
  // Déterminer les ordres disponibles
  const getAvailableOrdres = () => {
    const ordres = []
    const maxOrdre = moduleCountInFormation + 1
    
    for (let i = 1; i <= maxOrdre; i++) {
      // Si on édite, on peut garder l'ordre actuel
      // Sinon, on exclut les ordres déjà pris
      if (isEditing && i === module.ordre) {
        ordres.push(i)
      } else if (!isEditing || i !== module.ordre) {
        const isOrdreUsed = formationModules?.some(m => m.ordre === i && m.id !== module?.id)
        if (!isOrdreUsed) {
          ordres.push(i)
        }
      }
    }
    
    return ordres
  }

  const handleFormChange = (field, value) => {
    module[field] = value
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? 'Modifier le module' : 'Ajouter un module'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        
        <Form>
          <Form.Group className="mb-3">
            <label htmlFor="module-ordre" className="form-label">
              Position dans la formation
            </label>
            <Form.Select
              id="module-ordre"
              value={module?.ordre || ''}
              onChange={(e) => handleFormChange('ordre', Number.parseInt(e.target.value, 10))}
            >
              <option value="">Sélectionner une position</option>
              {getAvailableOrdres().map((ordre) => (
                <option key={ordre} value={ordre}>
                  Position {ordre}
                </option>
              ))}
            </Form.Select>
            <small className="text-muted d-block mt-1">
              {moduleCountInFormation} module(s) existant(s)
            </small>
          </Form.Group>

          <Form.Group className="mb-3">
            <label htmlFor="module-titre" className="form-label">
              Titre du module
            </label>
            <Form.Control
              id="module-titre"
              type="text"
              placeholder="Titre du module"
              value={module?.titre || ''}
              onChange={(e) => handleFormChange('titre', e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <label htmlFor="module-contenu" className="form-label">
              Contenu du module
            </label>
            <Form.Control
              id="module-contenu"
              as="textarea"
              rows={5}
              placeholder="Contenu du module (description, objectifs, ressources, etc.)"
              value={module?.contenu || ''}
              onChange={(e) => handleFormChange('contenu', e.target.value)}
            />
            <small className="text-muted d-block mt-1">
              {(module?.contenu || '').length} caractères
            </small>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="outline-secondary" 
          onClick={onHide} 
          disabled={isSaving}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={
            isSaving ||
            !module?.titre?.trim() ||
            !module?.contenu?.trim() ||
            !module?.ordre
          }
        >
          {getSaveButtonLabel(isSaving, Boolean(isEditing))}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

ModuleModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  module: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    titre: PropTypes.string,
    contenu: PropTypes.string,
    ordre: PropTypes.number,
  }),
  isSaving: PropTypes.bool,
  error: PropTypes.string,
  formationModules: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      titre: PropTypes.string,
      ordre: PropTypes.number,
    })
  ),
}

export default ModuleModal

