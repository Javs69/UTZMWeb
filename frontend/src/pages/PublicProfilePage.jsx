import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PaginationControls from '@/components/PaginationControls'
import ProductCard from '@/components/ProductCard'
import SupportTicketModal from '@/components/SupportTicketModal'
import { useApp } from '@/context/AppContext'
import { resolveAssetUrl } from '@/services/api'
import { accountService } from '@/services'
import { formatDate } from '@/utils/format'

const EMPTY_PAGINATION = {
  page: 1,
  page_size: 0,
  total: 0,
  total_pages: 0,
  has_prev: false,
  has_next: false,
}

function formatRating(value) {
  return `${Number(value || 0).toFixed(1)} / 5`
}

export default function PublicProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isLoggedIn, openAuth } = useApp()
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [products, setProducts] = useState([])
  const [reviewsPagination, setReviewsPagination] = useState(EMPTY_PAGINATION)
  const [productsPagination, setProductsPagination] = useState(EMPTY_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)

  const userId = Number(searchParams.get('id') || 0)
  const reviewsPage = Math.max(1, Number(searchParams.get('reviews_page') || 1))
  const productsPage = Math.max(1, Number(searchParams.get('products_page') || 1))

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        const data = await accountService.getPublicProfile(userId, {
          reviewsPage,
          reviewsPageSize: 6,
          productsPage,
          productsPageSize: 8,
        })
        if (!active) return
        setProfile(data.profile || null)
        setReviews(Array.isArray(data.reviews) ? data.reviews : [])
        setProducts(Array.isArray(data.products) ? data.products : [])
        setReviewsPagination(data.reviews_pagination || EMPTY_PAGINATION)
        setProductsPagination(data.products_pagination || EMPTY_PAGINATION)
      } catch (requestError) {
        if (!active) return
        setError(requestError.message)
        setProfile(null)
        setReviews([])
        setProducts([])
        setReviewsPagination(EMPTY_PAGINATION)
        setProductsPagination(EMPTY_PAGINATION)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (userId > 0) {
      loadProfile()
    } else {
      setLoading(false)
      setError('Perfil no válido.')
    }

    return () => {
      active = false
    }
  }, [productsPage, reviewsPage, userId])

  const profileTitle = useMemo(() => {
    if (!profile) return 'Perfil público'
    return profile.store_name || profile.full_name || 'Perfil público'
  }, [profile])

  function openReportModal() {
    if (!isLoggedIn) {
      openAuth('login')
      return
    }
    setReportOpen(true)
  }

  function updatePageParam(key, value) {
    const nextParams = new URLSearchParams(searchParams)
    if (!value || value <= 1) {
      nextParams.delete(key)
    } else {
      nextParams.set(key, String(value))
    }
    setSearchParams(nextParams)
  }

  return (
    <main className="container public-profile-page">
      {loading ? (
        <div className="card" style={{ padding: 18 }}>
          Cargando perfil...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="card" style={{ padding: 18 }}>
          {error}
        </div>
      ) : null}

      {!loading && !error && profile ? (
        <>
          <section className="public-profile-hero card">
            <div className="public-profile-hero__main">
              <img
                className="public-profile-hero__avatar"
                src={resolveAssetUrl(profile.avatar_url)}
                alt={profile.full_name || 'Perfil'}
              />
              <div className="public-profile-hero__content">
                <div className="public-profile-hero__eyebrow">Perfil público</div>
                <div className="public-profile-hero__title-row">
                  <h1>{profileTitle}</h1>
                  {profile.seller_verified ? (
                    <span className="seller-verified-pill is-verified">Vendedor verificado</span>
                  ) : null}
                </div>
                <p className="public-profile-hero__name">{profile.full_name || 'Usuario sin nombre'}</p>
                <div className="public-profile-hero__stats">
                  <span>{formatRating(profile.avg_rating)} de calificación</span>
                  <span>{profile.review_count} reseñas</span>
                  <span>{profile.product_count} productos activos</span>
                  <span>{profile.sales_count} ventas completadas</span>
                </div>
                <p className="public-profile-hero__bio">
                  {profile.seller_bio || 'Este usuario todavía no agregó una descripción pública.'}
                </p>
                <div className="form-actions public-profile-hero__actions">
                  <button className="btn btn-ghost" type="button" onClick={openReportModal}>
                    Reportar vendedor
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="public-profile-section">
            <div className="strip-head">
              <h2>Reseñas recibidas</h2>
              <span className="muted">
                {reviewsPagination.total} {reviewsPagination.total === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>

            {!reviews.length ? (
              <div className="card" style={{ padding: 18 }}>
                Todavía no hay reseñas para este perfil.
              </div>
            ) : (
              <>
                <div className="public-profile-reviews">
                  {reviews.map((review) => (
                    <article key={review.id} className="public-profile-review card">
                      <div className="public-profile-review__head">
                        <div>
                          <div className="public-profile-review__author">
                            <Link className="link" to={`/perfil.html?id=${review.reviewer_id}`}>
                              {review.reviewer_name || 'Usuario'}
                            </Link>
                          </div>
                          <div className="public-profile-review__meta">{formatDate(review.created_at, true)}</div>
                        </div>
                        <strong>{formatRating(review.rating)}</strong>
                      </div>
                      <p>{review.comment || 'Sin comentario.'}</p>
                    </article>
                  ))}
                </div>

                <PaginationControls
                  pagination={reviewsPagination}
                  onPageChange={(nextPage) => updatePageParam('reviews_page', nextPage)}
                  label="Paginación de reseñas del perfil"
                />
              </>
            )}
          </section>

          <section className="public-profile-section">
            <div className="strip-head">
              <h2>Productos publicados</h2>
              <span className="muted">
                {productsPagination.total} {productsPagination.total === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            {!products.length ? (
              <div className="card" style={{ padding: 18 }}>
                Este usuario no tiene productos publicados por ahora.
              </div>
            ) : (
              <>
                <div className="catalog-results-grid public-profile-products-grid">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <PaginationControls
                  pagination={productsPagination}
                  onPageChange={(nextPage) => updatePageParam('products_page', nextPage)}
                  label="Paginación de productos del perfil"
                />
              </>
            )}
          </section>
        </>
      ) : null}

      <SupportTicketModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Reportar vendedor"
        intro="Explica por qué este vendedor debe ser revisado por el equipo de soporte."
        categoryOptions={[{ value: 'report_seller', label: 'Reporte de vendedor' }]}
        defaultCategory="report_seller"
        defaultSubject={`Reporte del vendedor: ${profileTitle}`}
        defaultDescription="Quiero reportar a este vendedor porque: "
        contextType="seller"
        contextId={profile?.id || null}
        contextMeta={profile ? { seller_name: profileTitle } : null}
        submitLabel="Enviar reporte"
      />
    </main>
  )
}
