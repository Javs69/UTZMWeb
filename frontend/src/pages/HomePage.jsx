import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PaginationControls from '@/components/PaginationControls'
import ProductCarousel from '@/components/ProductCarousel'
import ProductCard from '@/components/ProductCard'
import { getCategoryLabel } from '@/config/categories'
import { PRODUCT_CONDITIONS } from '@/config/productMeta'
import { useApp } from '@/context/AppContext'
import { productService } from '@/services'

const PAGE_SIZE = 12
const HOME_PAGE_SIZE = 120

const EMPTY_PAGINATION = {
  page: 1,
  page_size: PAGE_SIZE,
  total: 0,
  total_pages: 0,
  has_prev: false,
  has_next: false,
}

export default function HomePage() {
  const { categories, favorites } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(EMPTY_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'recent'
  const availability = searchParams.get('availability') || 'in_stock'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const condition = searchParams.get('condition') || ''
  const featuredOnly = searchParams.get('featured') === '1'
  const favoritesOnly = searchParams.get('favorites') === '1'
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const hasActiveCatalogFilters = Boolean(
    query ||
    category ||
    sort !== 'recent' ||
    availability !== 'in_stock' ||
    minPrice ||
    maxPrice ||
    condition ||
    featuredOnly ||
    favoritesOnly,
  )
  const activeCatalogFilterCount = [
    sort !== 'recent',
    availability !== 'in_stock',
    Boolean(minPrice),
    Boolean(maxPrice),
    Boolean(condition),
    featuredOnly,
    favoritesOnly,
  ].filter(Boolean).length

  const favoriteIds = useMemo(
    () => favorites.map((item) => Number(item.product_id)).filter((id) => id > 0),
    [favorites],
  )

  useEffect(() => {
    let active = true

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        if (favoritesOnly && !favoriteIds.length) {
          if (!active) {
            return
          }
          setProducts([])
          setPagination(EMPTY_PAGINATION)
          return
        }

        const data = await productService.getProducts({
          query,
          category,
          sort,
          availability,
          minPrice,
          maxPrice,
          condition,
          featured: featuredOnly,
          ids: favoritesOnly ? favoriteIds : [],
          page: hasActiveCatalogFilters ? page : 1,
          pageSize: hasActiveCatalogFilters ? PAGE_SIZE : HOME_PAGE_SIZE,
        })

        if (!active) {
          return
        }

        setProducts(Array.isArray(data.items) ? data.items : [])
        setPagination(data.pagination || EMPTY_PAGINATION)
      } catch (requestError) {
        if (!active) {
          return
        }

        setError(requestError.message)
        setProducts([])
        setPagination(EMPTY_PAGINATION)
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
  }, [availability, category, condition, favoriteIds, favoritesOnly, featuredOnly, hasActiveCatalogFilters, maxPrice, minPrice, page, query, sort])

  function updateCatalogParams(updates, resetPage = true) {
    const params = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      const normalizedValue = typeof value === 'string' ? value.trim() : value
      if (
        normalizedValue === '' ||
        normalizedValue === null ||
        normalizedValue === false ||
        (key === 'sort' && normalizedValue === 'recent') ||
        (key === 'availability' && normalizedValue === 'in_stock') ||
        (key === 'page' && Number(normalizedValue) <= 1)
      ) {
        params.delete(key)
        return
      }

      params.set(key, String(normalizedValue))
    })

    if (resetPage) {
      params.delete('page')
    }

    setSearchParams(params)
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage === page) {
      return
    }

    updateCatalogParams({ page: nextPage }, false)
  }

  function resetCatalogFilters() {
    setSearchParams(new URLSearchParams())
  }

  const catalogTitle = query
    ? `Resultados para "${query}"`
    : category
      ? getCategoryLabel(category, categories)
      : 'Explorar productos'

  const sections = useMemo(() => {
    if (hasActiveCatalogFilters) {
      return []
    }

    const groupedSections = categories.map((categoryItem) => ({
      title: categoryItem.label,
      items: products.filter((product) => Number(product.category_id) === Number(categoryItem.id)),
    })).filter((section) => section.items.length)

    const uncategorized = products.filter((product) => !product.category_id)
    if (uncategorized.length) {
      groupedSections.push({ title: 'Sin categoría', items: uncategorized })
    }

    return groupedSections
  }, [hasActiveCatalogFilters, products])

  return (
    <main className="container catalog-page">
      <section className="catalog-toolbar card">
        <div className="catalog-toolbar__head">
          <div>
            <h2>{catalogTitle}</h2>
            <p className="form-hint">
              Filtra por disponibilidad, precio, estado o destacados. Los productos pausados o eliminados ya no aparecen aquí.
            </p>
          </div>
          <div className="catalog-toolbar__actions">
            <button
              className={`catalog-toolbar__filters-btn${isFiltersOpen ? ' is-open' : ''}`}
              type="button"
              aria-expanded={isFiltersOpen}
              aria-controls="catalog-filters-panel"
              onClick={() => setIsFiltersOpen((current) => !current)}
            >
              <span>Filtros y orden</span>
              {activeCatalogFilterCount ? <span className="catalog-toolbar__filters-count">{activeCatalogFilterCount}</span> : null}
              <span className="catalog-toolbar__filters-icon" aria-hidden="true">v</span>
            </button>
            {hasActiveCatalogFilters ? (
              <button className="catalog-toolbar__reset" type="button" onClick={resetCatalogFilters}>
                Reiniciar filtros
              </button>
            ) : null}
          </div>
        </div>

        <div
          id="catalog-filters-panel"
          className={`catalog-toolbar__panel${isFiltersOpen ? ' is-open' : ''}`}
          hidden={!isFiltersOpen}
        >
          <div className="catalog-toolbar__grid catalog-toolbar__grid--expanded">
            <div className="form-group">
              <label className="form-label">Ordenar por</label>
              <select className="form-control" value={sort} onChange={(event) => updateCatalogParams({ sort: event.target.value })}>
                <option value="recent">Más recientes</option>
                <option value="featured">Destacados primero</option>
                <option value="oldest">Más antiguos</option>
                <option value="price_asc">Precio menor a mayor</option>
                <option value="price_desc">Precio mayor a menor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Disponibilidad</label>
              <select className="form-control" value={availability} onChange={(event) => updateCatalogParams({ availability: event.target.value })}>
                <option value="in_stock">Solo disponibles</option>
                <option value="all">Todos</option>
                <option value="out_of_stock">Solo sin stock</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Precio mínimo</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) => updateCatalogParams({ min_price: event.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Precio máximo</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => updateCatalogParams({ max_price: event.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Condición</label>
              <select className="form-control" value={condition} onChange={(event) => updateCatalogParams({ condition: event.target.value })}>
                <option value="">Todas</option>
                {PRODUCT_CONDITIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destacados</label>
              <button
                className={`catalog-toolbar__toggle${featuredOnly ? ' is-active' : ''}`}
                type="button"
                onClick={() => updateCatalogParams({ featured: featuredOnly ? '' : '1' })}
              >
                {featuredOnly ? 'Solo destacados' : 'Incluir destacados'}
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Favoritos</label>
              <button
                className={`catalog-toolbar__toggle${favoritesOnly ? ' is-active' : ''}`}
                type="button"
                onClick={() => updateCatalogParams({ favorites: favoritesOnly ? '' : '1' })}
              >
                {favoritesOnly ? 'Solo favoritos' : 'Mostrar favoritos'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog-results">
        <div className="strip-head">
          <h2>{hasActiveCatalogFilters ? 'Resultados' : 'Categorías'}</h2>
          <span className="muted">
            {pagination.total} {pagination.total === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 18 }}>
            Cargando productos...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="card" style={{ padding: 18 }}>
            {error}
          </div>
        ) : null}

        {!loading && !error && !products.length ? (
          <div className="card" style={{ padding: 18 }}>
            {hasActiveCatalogFilters
              ? 'No se encontraron productos con los filtros actuales.'
              : 'No hay productos disponibles por el momento.'}
          </div>
        ) : null}

        {!loading && !error && products.length && hasActiveCatalogFilters ? (
          <>
            <div className="catalog-results-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
              label="Paginacion del catalogo"
            />
          </>
        ) : null}

        {!loading && !error && products.length && !hasActiveCatalogFilters ? (
          sections.map((section) => (
            <ProductCarousel key={section.title} title={section.title} items={section.items} />
          ))
        ) : null}
      </section>
    </main>
  )
}
