import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCarousel from '@/components/ProductCarousel'
import { CATEGORIES, getCategoryLabel } from '@/config/categories'
import { productService } from '@/services'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''

  useEffect(() => {
    let active = true

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const data = await productService.getProducts({ query, category })
        if (active) {
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message)
          setProducts([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      active = false
    }
  }, [category, query])

  const sections = useMemo(() => {
    if (query || category) {
      const title = category ? getCategoryLabel(category) : 'Resultados'
      return [{ title: query ? `Resultados: ${query}` : title, items: products }]
    }

    const groupedSections = CATEGORIES.map((categoryItem) => ({
      title: categoryItem.label,
      items: products.filter((product) => Number(product.category_id) === Number(categoryItem.id)),
    })).filter((section) => section.items.length)

    const uncategorized = products.filter((product) => !product.category_id)
    if (uncategorized.length) {
      groupedSections.push({ title: 'Sin categoria', items: uncategorized })
    }

    return groupedSections
  }, [products])

  return (
    <main className="container" style={{ padding: '18px 0 34px' }}>
      {loading ? (
        <section className="strip">
          <div className="card" style={{ padding: 18 }}>
            Cargando productos...
          </div>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="strip">
          <div className="card" style={{ padding: 18 }}>
            {error}
          </div>
        </section>
      ) : null}

      {!loading && !error && (query || category) ? (
        sections.map((section) => <ProductCarousel key={section.title} title={section.title} items={section.items} />)
      ) : null}

      {!loading && !error && !query && !category ? (
        sections.map((section) => <ProductCarousel key={section.title} title={section.title} items={section.items} />)
      ) : null}

      {!loading && !error && !products.length ? (
        <section className="strip">
          <div className="card" style={{ padding: 18 }}>
            No se encontraron productos.
          </div>
        </section>
      ) : null}
    </main>
  )
}
