import { useEffect, useMemo, useState } from 'react'
import { orderService } from '@/services'
import { useApp } from '@/context/AppContext'
import { formatCurrency, formatDate } from '@/utils/format'

export default function OrdersPage() {
  const { session } = useApp()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [message, setMessage] = useState('')

  async function loadOrders() {
    try {
      const data = await orderService.getOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      setMessage(error.message)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const groupedOrders = useMemo(() => {
    const userId = Number(session.user?.id)
    return {
      purchases: orders.filter((order) => Number(order.buyer_id) === userId),
      sales: orders.filter((order) => Number(order.seller_id) === userId),
    }
  }, [orders, session.user?.id])

  async function confirmDelivery(orderId) {
    try {
      await orderService.markDelivered({ orderId })
      await loadOrders()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function cancelOrder(orderId) {
    try {
      await orderService.cancelOrder(orderId)
      await loadOrders()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function OrderGroup({ title, items, role }) {
    return (
      <section className="orders-group card">
        <div className="orders-section__head">
          <h3>{title}</h3>
          <span className="muted">
            {items.length} {items.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
        <div className="orders-cards">
          {items.map((order) => {
            const canConfirm = role === 'seller' && order.status !== 'delivered' && order.status !== 'cancelled'
            const canCancel = order.status !== 'delivered' && order.status !== 'cancelled'
            return (
              <div key={order.id} className="card order-card" onClick={() => setSelectedOrder(order)}>
                <div className="card-body">
                  <div className="order-card-head">
                    <div>
                      <h3 className="card-title" style={{ margin: 0 }}>
                        Pedido #{order.id}
                      </h3>
                      <div className="order-sub">
                        {role === 'buyer' ? 'Vendedor' : 'Comprador'}:{' '}
                        {role === 'buyer' ? order.seller_name : order.buyer_name}
                      </div>
                    </div>
                    <div className="order-head-right">
                      <span className="price">
                        <span className="now">{formatCurrency(order.total_cents)}</span>
                      </span>
                      <span className="status-pill">{order.status}</span>
                    </div>
                  </div>
                  <div className="order-summary">
                    <span><strong>Fecha:</strong> {formatDate(order.created_at)}</span>
                    <span><strong>Pago:</strong> {order.payment_method_label || order.payment_method_type}</span>
                  </div>
                  <div className="card-actions" style={{ marginTop: 10 }}>
                    {canConfirm ? (
                      <button className="btn" type="button" onClick={(event) => { event.stopPropagation(); confirmDelivery(order.id) }}>
                        Confirmar entrega
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button className="btn btn-danger" type="button" onClick={(event) => { event.stopPropagation(); cancelOrder(order.id) }}>
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <main className="container" style={{ padding: '18px 0 34px' }}>
      <div className="orders-wrap">
        <div className="strip-head">
          <h2>Mis pedidos</h2>
          <p className="form-hint" style={{ margin: 0 }}>
            Consulta tus pedidos como comprador o vendedor.
          </p>
        </div>
        {message ? <div className="card" style={{ padding: 14 }}>{message}</div> : null}
        <div className="orders-sections">
          <OrderGroup title="Pedidos realizados" items={groupedOrders.purchases} role="buyer" />
          <OrderGroup title="Pedidos vendidos" items={groupedOrders.sales} role="seller" />
        </div>
      </div>

      {selectedOrder ? (
        <div className="modal" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setSelectedOrder(null)}>
              &times;
            </button>
            <h2>Detalle del pedido</h2>
            <div className="form-group"><div className="form-label">Estado</div><div>{selectedOrder.status}</div></div>
            <div className="form-group"><div className="form-label">Total</div><div>{formatCurrency(selectedOrder.total_cents)}</div></div>
            <div className="form-group"><div className="form-label">Creado</div><div>{formatDate(selectedOrder.created_at, true)}</div></div>
            <div className="form-group"><div className="form-label">Pagado</div><div>{selectedOrder.payment_paid_at ? formatDate(selectedOrder.payment_paid_at, true) : 'No pagado'}</div></div>
            <div className="form-group"><div className="form-label">Método de pago</div><div>{selectedOrder.payment_method_label || selectedOrder.payment_method_type}</div></div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
