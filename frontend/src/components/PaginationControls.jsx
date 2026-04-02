export default function PaginationControls({
  pagination,
  onPageChange,
  label = 'Paginacion',
}) {
  const totalPages = Number(pagination?.total_pages) || 0
  const currentPage = Number(pagination?.page) || 1

  if (totalPages <= 1) {
    return null
  }

  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, startPage + 4)
  const visiblePages = []

  for (let page = Math.max(1, endPage - 4); page <= endPage; page += 1) {
    visiblePages.push(page)
  }

  return (
    <nav className="pagination" aria-label={label}>
      <button
        className="pagination__btn"
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!pagination?.has_prev}
      >
        Anterior
      </button>

      <div className="pagination__pages">
        {visiblePages.map((page) => (
          <button
            key={page}
            className={`pagination__page${page === currentPage ? ' is-active' : ''}`}
            type="button"
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="pagination__btn"
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!pagination?.has_next}
      >
        Siguiente
      </button>
    </nav>
  )
}
