import React from 'react';

interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pageNumber, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
      <button
        className="btn btn-secondary"
        style={{ padding: '6px 12px', fontSize: '13px' }}
        disabled={pageNumber <= 1}
        onClick={() => onPageChange(pageNumber - 1)}
      >
        Previous
      </button>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        Page {pageNumber} of {totalPages}
      </span>
      <button
        className="btn btn-secondary"
        style={{ padding: '6px 12px', fontSize: '13px' }}
        disabled={pageNumber >= totalPages}
        onClick={() => onPageChange(pageNumber + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
