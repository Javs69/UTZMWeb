import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '@/config/categories'
import { PRODUCT_CONDITIONS } from '@/config/productMeta'
import { productService } from '@/services'

const INITIAL_FORM = {
  name: '',
  category: '',
  description: '',
  price: '',
  stock: '',
  condition: 'good',
  featured: false,
}

async function processImageForUpload(file, maxSide = 1920, quality = 0.85) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new window.Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { naturalWidth: w, naturalHeight: h } = img
      if (w > maxSide || h > maxSide) {
        const ratio = Math.min(maxSide / w, maxSide / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export default function SellPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('error')
  const [publishedProductId, setPublishedProductId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const nextPreviews = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))

    setPreviews(nextPreviews)

    return () => {
      nextPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.url)
      })
    }
  }, [files])

  function handleFilesSelected(event) {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) {
      return
    }

    setFiles((current) => [...current, ...selectedFiles].slice(0, 6))
    event.target.value = ''
  }

  function removeFile(indexToRemove) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function publishProduct() {
    setIsSubmitting(true)
    setMessage('')
    setMessageKind('error')
    setPublishedProductId(null)

    try {
      const data = await productService.createProduct({
        name: form.name,
        category: Number(form.category),
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        condition: form.condition,
        featured: form.featured,
      })

      const productId = data.product_id
      let imagesFailed = 0

      for (const file of files) {
        try {
          const processed = await processImageForUpload(file)
          await productService.uploadProductImage({ productId, file: processed })
        } catch {
          imagesFailed++
        }
      }

      if (imagesFailed > 0) {
        const total = files.length
        setPublishedProductId(productId)
        setMessageKind('warning')
        setMessage(
          imagesFailed === total
            ? 'Tu publicación fue creada, pero las imágenes no se pudieron subir. Puedes agregarlas desde "Mis productos".'
            : `Tu publicación fue creada. ${imagesFailed} de ${total} imagen(es) no se pudieron subir. Puedes agregarlas desde "Mis productos".`
        )
      } else {
        navigate(`/producto.html?id=${productId}`)
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="container" style={{ padding: '18px 0 34px' }}>
      <section className="hero-card" style={{ padding: 0 }}>
        <div className="hero-text" style={{ paddingBottom: 0 }}>
          <h1>Publicar producto</h1>
          <p>Completa los datos para crear tu publicación.</p>
        </div>
      </section>

      <section className="card" style={{ padding: 20, marginTop: 16 }}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nombre del producto</label>
            <input className="form-control" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="form-control" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              <option value="">Selecciona una categoría</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-control" rows="6" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Precio (MXN)</label>
              <input className="form-control" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock</label>
              <input className="form-control" type="number" min="1" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Condición</label>
              <select className="form-control" value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}>
                {PRODUCT_CONDITIONS.map((condition) => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="my-product-card__checkbox">
            <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
            Marcar como destacado
          </label>
          <div className="form-group">
            <label className="form-label">Imágenes</label>
            <input ref={fileInputRef} className="form-control" type="file" accept="image/*" multiple onChange={handleFilesSelected} />
            <div className="form-hint">Hasta 6 imágenes.</div>
            {previews.length ? (
              <div className="sell-image-preview-grid">
                {previews.map((preview, index) => (
                  <article key={preview.id} className="sell-image-preview-card">
                    <img src={preview.url} alt={`Vista previa ${index + 1}`} />
                    <div className="sell-image-preview-card__footer">
                      <span title={preview.name}>{preview.name}</span>
                      <button type="button" className="cart-remove" onClick={() => removeFile(index)} aria-label={`Eliminar imagen ${index + 1}`}>
                        &times;
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {message ? (
          <div
            className="form-hint"
            style={messageKind === 'warning' ? { color: '#b45309' } : undefined}
          >
            {message}
            {publishedProductId ? (
              <> <a href={`/producto.html?id=${publishedProductId}`}>Ver publicación →</a></>
            ) : null}
          </div>
        ) : null}
        <div className="form-actions">
          <button className="btn sell-submit-btn" type="button" onClick={publishProduct} disabled={isSubmitting}>
            {isSubmitting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </section>
    </main>
  )
}
