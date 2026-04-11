import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supportService } from '@/services'

export default function SupportTicketModal({
  open,
  onClose,
  title,
  intro = '',
  categoryOptions = [],
  defaultCategory = '',
  defaultSubject = '',
  defaultDescription = '',
  descriptionPlaceholder = 'Describe lo ocurrido con el mayor detalle posible.',
  orderId = null,
  contextType = '',
  contextId = null,
  contextMeta = null,
  submitLabel = 'Crear ticket',
}) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ category: defaultCategory, subject: defaultSubject, description: defaultDescription })
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setForm({
      category: defaultCategory || categoryOptions[0]?.value || '',
      subject: defaultSubject,
      description: defaultDescription,
    })
    setMessage('')
    setIsSubmitting(false)
  }, [open, defaultCategory, defaultDescription, defaultSubject, categoryOptions])

  if (!open) {
    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const data = await supportService.createTicket({
        category: form.category,
        subject: form.subject,
        description: form.description,
        order_id: orderId,
        context_type: contextType || null,
        context_id: contextId || null,
        context_meta: contextMeta || null,
      })
      onClose()
      navigate(`/soporte.html?ticket=${data.ticket_id}`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content support-entry-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          &times;
        </button>

        <div className="support-entry-modal__head">
          <h2>{title}</h2>
          {intro ? <p className="form-hint">{intro}</p> : null}
        </div>

        <form className="support-entry-modal__form" onSubmit={handleSubmit}>
          {categoryOptions.length > 1 ? (
            <div className="form-group">
              <label className="form-label">Tipo de ticket</label>
              <select
                className="form-control"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">Asunto</label>
            <input
              className="form-control"
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detalle</label>
            <textarea
              className="form-control"
              rows="5"
              placeholder={descriptionPlaceholder}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          {message ? <div className="form-hint">{message}</div> : null}

          <div className="form-actions support-entry-modal__actions">
            <button className="btn" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
