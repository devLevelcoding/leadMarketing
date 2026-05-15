import type { BatchSummary } from "../types";

export function LongTermPlanTab({ batches }: { batches: BatchSummary[] }) {
  const full90Days = [...batches];
  const lastBatch = batches[batches.length - 1];
  const lastDate = new Date(lastBatch?.date || new Date());

  for (let i = batches.length + 1; i <= 90; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + (i - batches.length));
    full90Days.push({
      id: 9000 + i,
      dayNumber: i,
      date: nextDate.toISOString(),
      quota: 25,
      sent: 0,
      skipped: 0,
      total: 0,
      isToday: false,
      isPast: false,
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700">90-Day Full Delivery Grid</h3>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Projection Mode</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10 gap-2">
          {full90Days.map(b => {
            const isProjected = b.dayNumber > 30;
            const isToday = b.isToday;
            return (
              <div key={b.id} className={`border rounded-lg p-2 text-center transition-all ${
                isToday ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" :
                isProjected ? "border-gray-100 bg-gray-50/50 opacity-80" : "border-green-100 bg-green-50"
              }`}>
                <p className="text-[10px] font-bold text-gray-500">Day {b.dayNumber}</p>
                <p className="text-[10px] text-gray-400">{new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <div className="mt-1">
                  <p className="text-xs font-bold text-gray-700">{b.quota}</p>
                  <p className="text-[9px] text-gray-400">emails</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
        <p className="text-xs text-blue-700 flex items-center gap-2">
          <span>ℹ️</span> Days 31-90 are calculated at a steady state of 25 emails per day (max warmup capacity).
        </p>
      </div>
    </div>
  );
}
