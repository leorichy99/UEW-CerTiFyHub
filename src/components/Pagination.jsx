import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  className = "",
}) {
  const pages = [];
  const maxVisible = 7;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Showing</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="rounded-lg border border-brand-dark bg-brand-dark px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>of {totalItems} items</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="rounded-lg p-2 text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={16} />
        </button>

        {start > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="rounded-lg bg-brand-dark px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)]"
            >
              1
            </button>
            {start > 2 && (
              <span className="px-2 text-slate-400">...</span>
            )}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              page === currentPage
                ? "bg-(--color-brand-dark) text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)]"
                : "text-slate-600 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)]"
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="px-2 text-slate-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="rounded-lg active:bg-(--color-brand-dark) px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)]"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="rounded-lg p-2 text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
