// src/components/common/Pagination.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
}

const getPageList = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((p, idx) => {
    if (idx > 0 && p - (sorted[idx - 1] as number) > 1) result.push('ellipsis');
    result.push(p);
  });
  return result;
};

export const Pagination: React.FC<PaginationProps> = ({
  pageNumber,
  totalPages,
  onPageChange,
  totalCount,
  pageSize,
}) => {
  if (totalPages <= 1) return null;

  const pages = getPageList(pageNumber, totalPages);

  const rangeText =
    totalCount != null && pageSize != null
      ? `Showing ${(pageNumber - 1) * pageSize + 1}–${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount}`
      : `Page ${pageNumber} of ${totalPages}`;

  return (
    <div className="admin-pagination">
      <span className="admin-pagination-info">{rangeText}</span>
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="admin-page-btn"
          disabled={pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="admin-pagination-info">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`admin-page-btn ${p === pageNumber ? 'is-active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="admin-page-btn"
          disabled={pageNumber >= totalPages}
          onClick={() => onPageChange(pageNumber + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;