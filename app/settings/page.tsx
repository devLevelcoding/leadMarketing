"use client";
import { useEffect, useState } from "react";

const DEFAULTS = { pageSize: 10 };

export default function SettingsPage() {
  const [pageSize, setPageSize] = useState(DEFAULTS.pageSize);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("warmup_pageSize");
    if (stored) setPageSize(parseInt(stored));
  }, []);

  function save() {
    localStorage.setItem("warmup_pageSize", String(pageSize));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your LeadManager preferences</p>
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-700">Warmup Grid</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leads per page
          </label>
          <p className="text-xs text-gray-400 mb-2">How many leads to show per page in the Today grid</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={100}
              value={pageSize}
              onChange={e => setPageSize(Math.max(5, Math.min(100, parseInt(e.target.value) || 10)))}
              className="w-24 border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-400">leads per page (min 5, max 100)</span>
          </div>
        </div>

        <button
          onClick={save}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
