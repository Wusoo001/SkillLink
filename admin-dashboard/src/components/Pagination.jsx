import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, pages, onPageChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-inkMuted">
        Page <span className="font-bold text-ink">{page}</span> of {pages}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-inkSoft text-sm font-semibold hover:bg-primaryLight disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-inkSoft text-sm font-semibold hover:bg-primaryLight disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}