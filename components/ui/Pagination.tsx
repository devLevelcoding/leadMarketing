type Props = { page: number; totalPages: number; setPage: (p: number) => void; accent?: "blue" | "green" };

export default function Pagination({ page, totalPages, setPage, accent = "blue" }: Props) {
  const active = accent === "green" ? "bg-green-600 border-green-600 text-white" : "bg-blue-600 border-blue-600 text-white";
  const VISIBLE = 5;
  let start = Math.max(1, page - Math.floor(VISIBLE / 2));
  const end = Math.min(totalPages, start + VISIBLE - 1);
  start = Math.max(1, end - VISIBLE + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        onClick={() => { if (page > 1) setPage(page - 1); }}
        disabled={page === 1}
        className="px-3 py-1.5 rounded border text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        ← Prev
      </button>
      {pages.map(n => (
        <button
          key={n}
          onClick={() => setPage(n)}
          className={`w-9 h-9 rounded border text-sm font-medium transition ${n === page ? active : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => { if (page < totalPages) setPage(page + 1); }}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded border text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        Next →
      </button>
    </div>
  );
}
