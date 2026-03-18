import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '@/components/ProductCard'
import { productService } from '@/services'

function ProductSection({ title, items }) {
  return (
    <section className="strip">
      <div className="strip-head">
        <h2>{title}</h2>
      </div>
      <div className="grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

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

  const splitProducts = useMemo(() => {
    const middle = Math.ceil(products.length / 2)
    return {
      offers: products.slice(0, middle),
      recommended: products.slice(middle),
    }
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
        <ProductSection title="Resultados" items={products} />
      ) : null}

      {!loading && !error && !query && !category ? (
        <>
          <ProductSection title="Ofertas" items={splitProducts.offers} />
          <ProductSection title="Recomendados" items={splitProducts.recommended} />
        </>
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
