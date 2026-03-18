import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderService, paymentService } from '@/services'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/utils/format'
import { loadPaypalSdk } from '@/lib/paypal'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { cartItems, clearCart } = useApp()
  const paypalButtonsRef = useRef(null)
  const [method, setMethod] = useState('paypal')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paypalConfig, setPaypalConfig] = useState(null)

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price_cents) * Number(item.qty), 0),
    [cartItems],
  )

  useEffect(() => {
    paymentService
      .getPaypalConfig()
      .then(setPaypalConfig)
      .catch((error) => setMessage(error.message))
  }, [])

  useEffect(() => {
    if (!cartItems.length) {
      navigate('/')
    }
  }, [cartItems.length, navigate])

  useEffect(() => {
    if (method !== 'paypal' || !paypalConfig || !paypalButtonsRef.current || !total || !cartItems.length) {
      return
    }

    let isActive = true
    paypalButtonsRef.current.innerHTML = ''

    loadPaypalSdk({
      clientId: paypalConfig.client_id,
      currency: paypalConfig.currency,
    })
      .then((paypal) => {
        if (!isActive || !paypalButtonsRef.current) {
          return
        }

        const buttons = paypal.Buttons({
          style: {
            layout: 'vertical',
            shape: 'rect',
            label: 'paypal',
          },
          createOrder(data, actions) {
            setMessage('')
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    currency_code: paypalConfig.currency,
                    value: (total / 100).toFixed(2),
                  },
                },
              ],
            })
          },
          async onApprove(data, actions) {
            setIsSubmitting(true)
            setMessage('')

            try {
              await actions.order.capture()
              await orderService.checkoutCart({
                cartItems,
                paymentMeta: {
                  type: 'paypal',
                  label: 'PayPal',
                  last4: null,
                  paypal_order_id: data.orderID,
                },
              })
              clearCart()
              navigate('/pedidos.html')
            } catch (error) {
              setMessage(error.message)
            } finally {
              setIsSubmitting(false)
            }
          },
          onCancel() {
            setMessage('El pago con PayPal fue cancelado.')
          },
          onError() {
            setMessage('No se pudo procesar el pago con PayPal.')
          },
        })

        if (buttons.isEligible()) {
          buttons.render(paypalButtonsRef.current)
        } else {
          setMessage('PayPal no esta disponible para este navegador o configuracion.')
        }
      })
      .catch((error) => {
        if (isActive) {
          setMessage(error.message)
        }
      })

    return () => {
      isActive = false
      if (paypalButtonsRef.current) {
        paypalButtonsRef.current.innerHTML = ''
      }
    }
  }, [cartItems, clearCart, method, navigate, paypalConfig, total])

  async function handleCashPay() {
    setIsSubmitting(true)
    setMessage('')

    try {
      await orderService.checkoutCart({
        cartItems,
        paymentMeta: { type: 'cash', label: 'Efectivo', last4: null },
      })
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
        <p className="form-hint">Elige un metodo para finalizar tu compra. PayPal corre en sandbox.</p>

        <div className="form-group">
          <label className="form-label">Metodo de pago</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label><input type="radio" checked={method === 'paypal'} onChange={() => setMethod('paypal')} /> PayPal</label>
            <label><input type="radio" checked={method === 'cash'} onChange={() => setMethod('cash')} /> Efectivo</label>
          </div>
        </div>

        {method === 'paypal' ? (
          <div className="form-group" style={{ marginTop: 12 }}>
            <div className="form-hint" style={{ marginBottom: 10 }}>
              Usa tu cuenta sandbox de PayPal para aprobar y capturar el pago.
            </div>
            <div ref={paypalButtonsRef} />
          </div>
        ) : null}

        <div className="cart-total" style={{ marginTop: 10 }}>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        {message ? <div className="form-hint">{message}</div> : null}

        {method === 'cash' ? (
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={handleCashPay} disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Confirmar pago en efectivo'}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
