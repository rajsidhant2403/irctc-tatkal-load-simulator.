import React, { useState } from 'react';
import {
  SlotSummary,
  TimePoint,
  formatNumber,
} from '../utils/simulation';
import { Search } from 'lucide-react';

interface SlotBreakdownTableProps {
  slotSummaries: SlotSummary[];
  points: TimePoint[];
}

export const SlotBreakdownTable: React.FC<SlotBreakdownTableProps> = ({
  slotSummaries,
  points,
}) => {
  const [tableMode, setTableMode] = useState<'hourly' | 'crash-minutes'>('hourly');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSlots = slotSummaries.filter((slot) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      slot.timeStr.toLowerCase().includes(q) ||
      slot.zoneSlotLabel.toLowerCase().includes(q) ||
      slot.exampleCity.toLowerCase().includes(q) ||
      slot.railwayZones.toLowerCase().includes(q) ||
      slot.currentSlotLabel.toLowerCase().includes(q)
    );
  });

  const crashMinutes = points.filter((p) => {
    const matchesCrash = p.isCurrentCrash || p.isProposedCrash;
    if (!matchesCrash) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return p.timeStr.includes(q) || String(p.index).includes(q);
  });

  return (
    <section
      id="zone-schedule"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            02. Zone-Wise Time Slot Allocation & Server Utilization Matrix
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Comparative load distribution across the 4 staggered regional windows (09:00, 10:00, 11:00, and 12:00 IST)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter zone, city, or time..."
              aria-label="Filter zone, city, or time"
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
            />
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Table view mode"
          >
            <button
              type="button"
              onClick={() => setTableMode('hourly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tableMode === 'hourly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4 Hourly Zone Slots
            </button>
            <button
              type="button"
              onClick={() => setTableMode('crash-minutes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tableMode === 'crash-minutes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overload Minutes ({points.filter((p) => p.isCurrentCrash || p.isProposedCrash).length})
            </button>
          </div>
        </div>
      </div>

      {tableMode === 'hourly' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 pr-4">Time Slot</th>
                <th className="py-3 px-4">Current System Activity</th>
                <th className="py-3 px-4 text-right">Current Peak Load</th>
                <th className="py-3 px-4">Proposed Zone Window</th>
                <th className="py-3 px-4 text-right">Zone-Wise Load</th>
                <th className="py-3 px-4 text-right">Capacity Used</th>
                <th className="py-3 pl-4 text-right">System Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-500"
                  >
                    No matching time slots found for &ldquo;{searchQuery}&rdquo;.{' '}
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-sky-700 font-semibold underline ml-1"
                    >
                      Clear filter
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => (
                  <tr
                    key={slot.timeStr}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 pr-4 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {slot.timeStr} IST
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {slot.currentSlotLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {slot.currentUtilizationPct.toFixed(0)}% of crash limit ·{' '}
                        {slot.currentStatus === 'CRASH'
                          ? '▲ CRASH OVERLOAD'
                          : '● IDLE / NORMAL'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-red-700 whitespace-nowrap">
                      {formatNumber(slot.currentLoad)} req
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {slot.zoneSlotLabel}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {slot.exampleCity} · {slot.railwayZones}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-emerald-700 whitespace-nowrap">
                      {formatNumber(slot.proposedLoad)} req
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {slot.proposedUtilizationPct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                      {slot.proposedStatus === 'CRASH' ? (
                        <span className="text-red-700">▲ OVER CAPACITY</span>
                      ) : slot.proposedStatus === 'ELEVATED' ? (
                        <span className="text-amber-700">◆ ELEVATED SAFE</span>
                      ) : (
                        <span className="text-emerald-700">● SAFE NOMINAL</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 pr-4">Minute Index</th>
                <th className="py-3 px-4">Time of Day</th>
                <th className="py-3 px-4 text-right">Current System Load</th>
                <th className="py-3 px-4 text-right">Dropped / Excess Load</th>
                <th className="py-3 px-4 text-right">Zone-Wise Proposed Load</th>
                <th className="py-3 pl-4 text-right">Comparison Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
              {crashMinutes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center font-sans text-slate-500"
                  >
                    Zero server crash minutes detected under the current parameters.
                  </td>
                </tr>
              ) : (
                crashMinutes.map((pt) => (
                  <tr
                    key={pt.index}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 pr-4 text-slate-500">#{pt.index}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {pt.timeStr} IST
                    </td>
                    <td className="py-2.5 px-4 text-right text-red-700 font-semibold">
                      {formatNumber(pt.currentLoad)} req
                    </td>
                    <td className="py-2.5 px-4 text-right text-red-700">
                      +{formatNumber(pt.currentOverload)} req over limit
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">
                      {formatNumber(pt.proposedLoad)} req
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      {pt.isProposedCrash ? (
                        <span className="text-red-700">▲ BOTH OVER LIMIT</span>
                      ) : (
                        <span className="text-emerald-700">
                          ● CRASH PREVENTED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
