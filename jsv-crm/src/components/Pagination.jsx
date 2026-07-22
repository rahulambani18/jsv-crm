import { IconChevronLeft, IconChevronRight } from './Icons.jsx'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        {total === 0 ? 'No rows' : `${from}–${to} of ${total}`}
      </div>
      <div className="pagination-controls">
        <label className="pagination-size">
          Rows per page
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
        >
          <IconChevronLeft width={14} height={14} />
        </button>
        <span className="pagination-page">Page {page} of {totalPages}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          <IconChevronRight width={14} height={14} />
        </button>
      </div>
    </div>
  )
}
