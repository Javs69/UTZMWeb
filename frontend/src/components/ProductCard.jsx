import { Link } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/utils/format'
import { getProductImageSource, handleProductImageError } from '@/utils/productPlaceholder'
import { getConditionLabel } from '@/config/productMeta'

export default function ProductCard({ product }) {
  const { addToCart, isFavorite, toggleFavorite, isLoggedIn, openAuth } = useApp()
  const isOutOfStock = Number(product.stock) <= 0

  function handleAddToCart() {
    if (!isLoggedIn) {
      openAuth('login')
      return
    }

    addToCart({
      product_id: Number(product.id),
      name: product.name,
      price_cents: Number(product.price_cents),
      seller_id: Number(product.seller_id),
    })
  }

  return (
    <article className="card card--uniform">
      <div className="card-top">
        <button
          className={`btn-fav${isFavorite(product.id) ? ' is-active' : ''}`}
          type="button"
          aria-label="Agregar a favoritos"
          onClick={() =>
            toggleFavorite({
              product_id: Number(product.id),
              name: product.name,
              price_cents: Number(product.price_cents),
            })
          }
        >
          {isFavorite(product.id) ? '♥' : '♡'}
        </button>
      </div>
      <Link className="card-media" to={`/producto.html?id=${product.id}`}>
        <img
          src={getProductImageSource(product.image, product.name, 'Imagen pendiente')}
          alt={product.name}
          onError={(event) => handleProductImageError(event, product.name, 'Imagen pendiente')}
        />
      </Link>
      <div className="card-body">
        <div className="product-card__meta">
          {product.is_featured ? <span className="product-chip is-featured">Destacado</span> : null}
          {product.condition_code ? <span className="product-chip">{getConditionLabel(product.condition_code)}</span> : null}
          {product.pickup_location ? <span className="product-chip">{product.pickup_location}</span> : null}
        </div>
        <h3 className="card-title">
          <Link className="link" style={{ color: 'inherit', textDecoration: 'none' }} to={`/producto.html?id=${product.id}`}>
            {product.name}
          </Link>
        </h3>
        <div className="price">
          <span className="now">{formatCurrency(product.price_cents)}</span>
        </div>
        <div className="product-card__stock">
          {isOutOfStock ? 'Sin stock' : `Stock: ${product.stock}`}
        </div>
      </div>
      <div className="card-actions">
        <button className="btn btn-add" type="button" onClick={handleAddToCart} disabled={isOutOfStock}>
          {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
        </button>
      </div>
    </article>
  )
}
