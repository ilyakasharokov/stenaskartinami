import { CATALOG_ITEMS_PER_PAGE } from '@/constants/constants'

function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, count, setPage }) {
  const total = count ? Math.ceil(count / CATALOG_ITEMS_PER_PAGE) : 0;
  if (total <= 1) return null;

  const pages = getPages(currentPage, total);

  return (
    <div className="pagination">
      <button
        className="pagination__arrow"
        onClick={() => setPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Предыдущая страница"
      >
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="pagination__ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pagination__item${p === currentPage ? ' pagination__item--active' : ''}`}
            onClick={() => p !== currentPage && setPage(p)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pagination__arrow"
        onClick={() => setPage(currentPage + 1)}
        disabled={currentPage >= total}
        aria-label="Следующая страница"
      >
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
