interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxPagesToShow?: number; // total numeric buttons to show (centered)
  className?: string;
}

const DOTS = "...";

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

import styles from "../styles/dashboard.module.css";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxPagesToShow = 5,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const half = Math.floor(maxPagesToShow / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, currentPage + half);

  // ensure we show exactly maxPagesToShow when possible
  if (end - start + 1 < maxPagesToShow) {
    if (start === 1) {
      end = Math.min(totalPages, start + maxPagesToShow - 1);
    } else if (end === totalPages) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
  }

  const pages: (number | typeof DOTS)[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push(DOTS);
  }

  pages.push(...range(start, end));

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(DOTS);
    pages.push(totalPages);
  }

  const goTo = (page: number) => {
    const p = Math.max(1, Math.min(totalPages, page));
    if (p !== currentPage) onPageChange(p);
  };

  return (
    <div className={`${styles["dashboard-pagination"]} ${className ?? ""}`}>
      <button
        type="button"
        className={`${styles["dashboard-pagination-btn"]} ${styles["dashboard-pagination-prev"]}`}
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        &lt;
      </button>

      {pages.map((p, idx) =>
        p === DOTS ? (
          <span key={`dots-${idx}`} className={styles["dashboard-pagination-dots"]}>
            {DOTS}
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles["dashboard-pagination-btn"]} ${styles["dashboard-pagination-page"]} ${
              p === currentPage ? styles["dashboard-pagination-active"] : ""
            }`}
            onClick={() => goTo(Number(p))}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        className={`${styles["dashboard-pagination-btn"]} ${styles["dashboard-pagination-next"]}`}
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        &gt;
      </button>
    </div>
  );
}