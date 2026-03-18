import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountService, orderService } from '@/services'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/utils/format'

function detectBrand(number) {
  const digits = String(number || '').replace(/\D/g, '')
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  if (/^4/.test(digits)) return 'visa'
  return null
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { cartItems, clearCart } = useApp()
  const [method, setMethod] = useState('card')
  const [savedMethods, setSavedMethods] = useState([])
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [card, setCard] = useState({ name: '', number: '', exp: '', cvv: '' })
  const [savedCvv, setSavedCvv] = useState('')

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price_cents) * Number(item.qty), 0),
    [cartItems],
  )

  useEffect(() => {
    accountService.getPaymentMethods().then((data) => setSavedMethods(data.methods || []))
  }, [])

  useEffect(() => {
    if (!cartItems.length) {
      navigate('/')
    }
  }, [cartItems.length, navigate])

  async function handlePay() {
    setIsSubmitting(true)
    setMessage('')

    try {
      let paymentMeta
      if (method === 'cash') {
        paymentMeta = { type: 'cash', label: 'Efectivo', last4: null }
      } else if (method.startsWith('saved:')) {
        const selected = savedMethods.find((item) => item.id === Number(method.split(':')[1]))
        paymentMeta = {
          payment_method_id: selected.id,
          type: 'card',
          label: selected.label,
          last4: selected.last4,
          cvv: savedCvv,
        }
      } else {
        const brand = detectBrand(card.number)
        paymentMeta = {
          type: 'card',
          label: `Tarjeta ${brand || ''}`.trim(),
          last4: String(card.number).replace(/\D/g, '').slice(-4),
          cvv: card.cvv,
        }
      }

      await orderService.checkoutCart({ cartItems, paymentMeta })
      clearCart()
      navigate('/pedidos.html')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="container" style={{ padding: '18px 0 34px', display: 'flex', justifyContent: 'center' }}>
      <section className="card pay-card">
        <h2 style={{ marginTop: 0 }}>Completar pago</h2>
        <p className="form-hint">Elige un método para finalizar tu compra.</p>

        <div className="form-group">
          <label className="form-label">Método de pago</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label><input type="radio" checked={method === 'card'} onChange={() => setMethod('card')} /> Tarjeta nueva</label>
            <label><input type="radio" checked={method === 'cash'} onChange={() => setMethod('cash')} /> Efectivo</label>
            {savedMethods.map((saved) => (
              <label key={saved.id}>
                <input type="radio" checked={method === `saved:${saved.id}`} onChange={() => setMethod(`saved:${saved.id}`)} />
                {saved.label} (**** {saved.last4})
              </label>
            ))}
          </div>
        </div>

        {method === 'card' ? (
          <div className="form-grid" style={{ marginTop: 6 }}>
            <div className="form-group">
              <label className="form-label">Nombre en la tarjeta</label>
              <input className="form-control" value={card.name} onChange={(event) => setCard((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Número de tarjeta</label>
              <input className="form-control" value={card.number} onChange={(event) => setCard((current) => ({ ...current, number: event.target.value }))} />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Vencimiento</label>
                <input className="form-control" value={card.exp} onChange={(event) => setCard((current) => ({ ...current, exp: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">CVV</label>
                <input className="form-control" type="password" value={card.cvv} onChange={(event) => setCard((current) => ({ ...current, cvv: event.target.value }))} />
              </div>
            </div>
          </div>
        ) : null}

        {method.startsWith('saved:') ? (
          <div className="form-group">
            <label className="form-label">CVV de la tarjeta guardada</label>
            <input className="form-control" type="password" value={savedCvv} onChange={(event) => setSavedCvv(event.target.value)} />
          </div>
        ) : null}

        <div className="cart-total" style={{ marginTop: 10 }}>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        {message ? <div className="form-hint">{message}</div> : null}

        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={handlePay} disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : 'Pagar'}
          </button>
        </div>
      </section>
    </main>
  )
}
