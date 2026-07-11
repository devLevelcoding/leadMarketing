const COLORS: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  red:    "bg-red-50 text-red-700 border-red-200",
  green:  "bg-green-50 text-green-700 border-green-200",
  teal:   "bg-teal-50 text-teal-700 border-teal-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  gray:   "bg-gray-50 text-gray-700 border-gray-200",
};

export default function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${COLORS[color] || COLORS.gray}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs mt-1 font-medium uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
