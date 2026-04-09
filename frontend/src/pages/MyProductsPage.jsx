import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '@/config/categories'
import { PRODUCT_CONDITIONS, getConditionLabel, getProductStatusLabel } from '@/config/productMeta'
import { productService } from '@/services'
import { getProductImageSource, handleProductImageError } from '@/utils/productPlaceholder'

export default function MyProductsPage() {
  const [products, setProducts] = useState([])
  const [message, setMessage] = useState('')
  const [busyProductId, setBusyProductId] = useState(null)

  async function loadProducts() {
    try {
      const data = await productService.getMyProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      setMessage(error.message)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function saveProduct(product) {
    setBusyProductId(product.id)
    setMessage('')

    try {
      await productService.updateProduct({
        id: product.id,
        name: product.name,
        description: product.description,
        stock: product.stock,
        price: Number(product.price_cents) / 100,
        category: product.category_id || '',
        condition: product.condition_code,
        location: product.pickup_location || '',
        featured: Boolean(product.is_featured),
      })
      setMessage('Publicación actualizada.')
      await loadProducts()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusyProductId(null)
    }
  }

  async function runAction(productId, action) {
    setBusyProductId(productId)
    setMessage('')

    try {
      const response = await productService.runProductAction({ id: productId, action })
      setMessage(response.message || 'Acción completada.')
      await loadProducts()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusyProductId(null)
    }
  }

  function updateField(index, field, value) {
    setProducts((current) =>
      current.map((product, productIndex) =>
        productIndex === index ? { ...product, [field]: value } : product,
      ),
    )
  }

  return (
    <main className="container my-products-page">
      <section className="strip">
        <div className="strip-head">
          <h2>Mis publicaciones</h2>
          <p className="form-hint" style={{ margin: 0 }}>
            Edita datos base y gestiona cada anuncio con acciones rápidas.
          </p>
        </div>

        {message ? <div className="card" style={{ padding: 14 }}>{message}</div> : null}

        <div className="grid my-products-grid">
          {products.map((product, index) => {
            const isBusy = busyProductId === product.id
            const isDeleted = product.status === 'deleted'
            const isPaused = product.status === 'paused'

            return (
              <article key={product.id} className="card my-product-card">
                <div className="card-media my-product-card__media">
                  <img
                    src={getProductImageSource(product.image, product.name, 'Imagen pendiente')}
                    alt={product.name}
                    onError={(event) => handleProductImageError(event, product.name, 'Imagen pendiente')}
                  />
                </div>

                <div className="card-body">
                  <div className="my-product-card__header">
                    <span className={`product-status-pill is-${product.status}`}>
                      {getProductStatusLabel(product.status)}
                    </span>
                    {product.is_featured ? <span className="product-chip is-featured">Destacado</span> : null}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input
                      className="form-control"
                      value={product.name}
                      disabled={isDeleted}
                      onChange={(event) => updateField(index, 'name', event.target.value)}
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Precio (MXN)</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number(product.price_cents) / 100}
                        disabled={isDeleted}
                        onChange={(event) => updateField(index, 'price_cents', Math.round(Number(event.target.value || 0) * 100))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Stock</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={product.stock}
                        disabled={isDeleted}
                        onChange={(event) => updateField(index, 'stock', Number(event.target.value || 0))}
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <select
                        className="form-control"
                        value={product.category_id || ''}
                        disabled={isDeleted}
                        onChange={(event) => updateField(index, 'category_id', Number(event.target.value || 0))}
                      >
                        <option value="">Sin categoría</option>
                        {CATEGORIES.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Condición</label>
                      <select
                        className="form-control"
                        value={product.condition_code || 'good'}
                        disabled={isDeleted}
                        onChange={(event) => updateField(index, 'condition_code', event.target.value)}
                      >
                        {PRODUCT_CONDITIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                      <label className="form-label">Ubicación de entrega</label>
                    <input
                      className="form-control"
                      value={product.pickup_location || ''}
                      disabled={isDeleted}
                      placeholder="Ej. Biblioteca, Edificio A, Campus"
                      onChange={(event) => updateField(index, 'pickup_location', event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                      <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={product.description || ''}
                      disabled={isDeleted}
                      onChange={(event) => updateField(index, 'description', event.target.value)}
                    />
                  </div>

                  <label className="my-product-card__checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(product.is_featured)}
                      disabled={isDeleted}
                      onChange={(event) => updateField(index, 'is_featured', event.target.checked)}
                    />
                    Marcar como destacado
                  </label>

                  <div className="my-product-card__summary">
                    <span>{getConditionLabel(product.condition_code)}</span>
                    <span>{product.pickup_location || 'Sin ubicación'}</span>
                  </div>

                  <div className="form-actions my-product-card__actions">
                    <button className="btn" type="button" onClick={() => saveProduct(product)} disabled={isBusy || isDeleted}>
                      Guardar
                    </button>
                    {!isDeleted ? (
                      <Link className="btn" style={{ background: '#374151' }} to={`/producto.html?id=${product.id}`}>
                        Ver
                      </Link>
                    ) : null}
                    <button className="btn btn-ghost" type="button" onClick={() => runAction(product.id, 'duplicate')} disabled={isBusy}>
                      Duplicar
                    </button>
                  </div>

                  <div className="my-product-card__actions-grid">
                    {!isDeleted ? (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => runAction(product.id, isPaused ? 'resume' : 'pause')}
                        disabled={isBusy}
                      >
                        {isPaused ? 'Reactivar' : 'Pausar'}
                      </button>
                    ) : null}

                    {!isDeleted ? (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => runAction(product.id, 'mark_out_of_stock')}
                        disabled={isBusy || Number(product.stock) <= 0}
                      >
                        Marcar agotado
                      </button>
                    ) : null}

                    {!isDeleted ? (
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() => runAction(product.id, 'delete')}
                        disabled={isBusy}
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
