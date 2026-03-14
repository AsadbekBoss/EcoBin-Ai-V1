"use client";

import Style from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
};

function buildPages(totalPages: number, currentPage: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = [...pages]
    .filter((v) => v >= 1 && v <= totalPages)
    .sort((a, b) => a - b);

  const result: Array<number | string> = [];

  sorted.forEach((value, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      if (value - prev === 2) {
        result.push(prev + 1);
      } else if (value - prev > 2) {
        result.push("dots-" + prev + "-" + value);
      }
    }

    result.push(value);
  });

  return result;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPages(totalPages, page);

  return (
    <div className={`${Style.wrap} ${className}`.trim()} aria-label="Pagination">
      <button
        type="button"
        className={Style.navBtn}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Oldingi sahifa"
      >
        ‹
      </button>

      <div className={Style.pages}>
        {items.map((item, index) => {
          if (typeof item === "string") {
            return (
              <span key={`${item}-${index}`} className={Style.dots} aria-hidden="true">
                ...
              </span>
            );
          }

          const active = item === page;

          return (
            <button
              key={item}
              type="button"
              className={`${Style.pageBtn} ${active ? Style.pageBtnActive : ""}`}
              onClick={() => onChange(item)}
              aria-current={active ? "page" : undefined}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={Style.navBtn}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Keyingi sahifa"
      >
        ›
      </button>
    </div>
  );
}
