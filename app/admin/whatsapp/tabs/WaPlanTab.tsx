import type { WaBatchSummary } from "../types";
import { WA_SCHEDULE } from "../constants";

export function WaPlanTab({ batches }: { batches: WaBatchSummary[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">30-Day Schedule</h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {WA_SCHEDULE.map(row => (
            <div key={row.range} className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{row.range}</p>
              <p className="text-xl font-bold text-green-700 mt-1">{row.quota}</p>
              <p className="text-xs text-gray-400">contacts/day</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {batches.map(b => {
            const allSent = b.isPast && b.sent === b.quota;
            const partial = b.isPast && b.sent > 0 && b.sent < b.quota;
            const missed  = b.isPast && b.sent === 0;

            let cellClass = "border rounded-lg p-2 text-center transition-all ";
            if (b.isToday)  cellClass += "border-green-500 bg-green-50 ring-1 ring-green-500";
            else if (allSent) cellClass += "border-green-200 bg-green-50";
            else if (partial) cellClass += "border-yellow-200 bg-yellow-50";
            else if (missed)  cellClass += "border-red-100 bg-red-50";
            else              cellClass += "border-gray-100 bg-gray-50";

            return (
              <div key={b.id} className={cellClass}>
                <p className={`text-xs font-semibold ${b.isToday ? "text-green-700" : "text-gray-500"}`}>
                  Day {b.dayNumber}{b.isToday && <span className="ml-1 text-green-500">●</span>}
                </p>
                <p className="text-xs text-gray-400">{new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <p className="text-base font-bold mt-1">{b.quota}</p>
                {(b.isPast || b.isToday) ? (
                  <p className="text-xs mt-0.5">
                    <span className="text-green-600 font-medium">{b.sent}</span>
                    {b.replied  > 0 && <span className="text-purple-600 font-medium ml-0.5">+{b.replied}r</span>}
                    {b.skipped  > 0 && <span className="text-red-400 font-medium ml-0.5">-{b.skipped}s</span>}
                    <span className="text-gray-400">/{b.quota}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 mt-0.5">—</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-400 inline-block" />Today</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" />All sent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-100 inline-block" />Missed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" />Upcoming</span>
        </div>
      </div>
    </div>
  );
}
