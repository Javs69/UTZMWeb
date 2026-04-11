import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '@/config/categories'
import { PRODUCT_CONDITIONS, getConditionLabel, getProductStatusLabel } from '@/config/productMeta'
import { productService } from '@/services'
import { getProductImageSource, handleProductImageError } from '@/utils/productPlaceholder'
import { resolveAssetUrl } from '@/services/api'

export default function MyProductsPage() {
  const [products, setProducts] = useState([])
  const [message, setMessage] = useState('')
  const [busyProductId, setBusyProductId] = useState(null)
  const [photoEditId, setPhotoEditId] = useState(null)
  const [photoEditImages, setPhotoEditImages] = useState([])
  const [photoEditLoading, setPhotoEditLoading] = useState(false)
  const [photoEditMessage, setPhotoEditMessage] = useState('')
  const photoFileRef = useRef(null)

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

  async function openPhotoEdit(productId) {
    setPhotoEditId(productId)
    setPhotoEditImages([])
    setPhotoEditMessage('')
    setPhotoEditLoading(true)
    try {
      const data = await productService.getProductImages(productId)
      setPhotoEditImages(Array.isArray(data.images) ? data.images : [])
    } catch (error) {
      setPhotoEditMessage(error.message)
    } finally {
      setPhotoEditLoading(false)
    }
  }

  function closePhotoEdit() {
    setPhotoEditId(null)
    setPhotoEditImages([])
    setPhotoEditMessage('')
    if (photoFileRef.current) {
      photoFileRef.current.value = ''
    }
  }

  async function handleDeleteImage(imageId) {
    setPhotoEditMessage('')
    try {
      await productService.deleteProductImage(imageId)
      setPhotoEditImages((current) => current.filter((img) => img.id !== imageId))
      await loadProducts()
    } catch (error) {
      setPhotoEditMessage(error.message)
    }
  }

  async function handleAddPhotos(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length || !photoEditId) return
    event.target.value = ''

    setPhotoEditMessage('')
    const remaining = Math.max(0, 6 - photoEditImages.length)
    const toUpload = files.slice(0, remaining)

    if (toUpload.length === 0) {
      setPhotoEditMessage('Ya alcanzaste el límite de 6 imágenes.')
      return
    }

    setPhotoEditLoading(true)
    try {
      for (const file of toUpload) {
        await productService.uploadProductImage({ productId: photoEditId, file })
      }
      const data = await productService.getProductImages(photoEditId)
      setPhotoEditImages(Array.isArray(data.images) ? data.images : [])
      await loadProducts()
    } catch (error) {
      setPhotoEditMessage(error.message)
    } finally {
      setPhotoEditLoading(false)
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

                  <div className="my-product-card__actions">
                    <button className="btn my-product-card__actions-save" type="button" onClick={() => saveProduct(product)} disabled={isBusy || isDeleted}>
                      Guardar cambios
                    </button>
                    <div className="my-product-card__actions-secondary">
                      {!isDeleted ? (
                        <Link className="btn btn-ghost" to={`/producto.html?id=${product.id}`}>
                          Ver
                        </Link>
                      ) : null}
                      {!isDeleted ? (
                        <button
                          className={`btn btn-ghost${photoEditId === product.id ? ' is-active' : ''}`}
                          type="button"
                          onClick={() => photoEditId === product.id ? closePhotoEdit() : openPhotoEdit(product.id)}
                          disabled={isBusy}
                          data-testid={`btn-photos-${product.id}`}
                        >
                          Fotos
                        </button>
                      ) : null}
                      <button className="btn btn-ghost" type="button" onClick={() => runAction(product.id, 'duplicate')} disabled={isBusy}>
                        Duplicar
                      </button>
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
                          Agotado
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

                  {photoEditId === product.id ? (
                    <div className="photo-edit-panel" data-testid="photo-edit-panel">
                      <div className="photo-edit-panel__header">
                        <span className="photo-edit-panel__title">Fotos de la publicación</span>
                        <button className="photo-edit-panel__close" type="button" onClick={closePhotoEdit} aria-label="Cerrar editor de fotos">&times;</button>
                      </div>

                      {photoEditLoading ? (
                        <p className="form-hint">Cargando...</p>
                      ) : (
                        <>
                          {photoEditImages.length > 0 ? (
                            <div className="sell-image-preview-grid">
                              {photoEditImages.map((img) => (
                                <article key={img.id} className="sell-image-preview-card">
                                  <img
                                    src={resolveAssetUrl(img.url)}
                                    alt="Foto del producto"
                                    onError={(e) => { e.currentTarget.style.opacity = '0.4' }}
                                  />
                                  <div className="sell-image-preview-card__footer">
                                    <span>Foto</span>
                                    <button
                                      type="button"
                                      className="cart-remove"
                                      onClick={() => handleDeleteImage(img.id)}
                                      aria-label="Eliminar foto"
                                      data-testid={`btn-delete-image-${img.id}`}
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="form-hint">Esta publicación no tiene fotos aún.</p>
                          )}

                          {photoEditImages.length < 6 ? (
                            <div className="photo-edit-panel__upload">
                              <label className="btn btn-ghost photo-edit-panel__upload-btn">
                                + Agregar fotos
                                <input
                                  ref={photoFileRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  style={{ display: 'none' }}
                                  onChange={handleAddPhotos}
                                  data-testid="input-add-photos"
                                />
                              </label>
                              <span className="form-hint">{photoEditImages.length}/6 fotos</span>
                            </div>
                          ) : (
                            <p className="form-hint">Límite de 6 fotos alcanzado.</p>
                          )}
                        </>
                      )}

                      {photoEditMessage ? (
                        <p className="form-hint photo-edit-panel__error">{photoEditMessage}</p>
                      ) : null}
                    </div>
                  ) : null}

                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
