/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  DEFAULT_PARAMS,
  PRESET_SCENARIOS,
  SimulationParams,
  generateSimulationData,
  calculateMetrics,
  formatNumber,
} from './utils/simulation';
import {
  LoadGraphCanvas,
  ChartViewMode,
} from './components/LoadGraphCanvas';
import { ControlDeck } from './components/ControlDeck';
import { SlotBreakdownTable } from './components/SlotBreakdownTable';
import { PythonCodePanel } from './components/PythonCodePanel';

export default function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [activePreset, setActivePreset] = useState<string>('default');
  const [viewMode, setViewMode] = useState<ChartViewMode>('full');
  const [exportStatusMsg, setExportStatusMsg] = useState<string | null>(null);

  const points = useMemo(() => generateSimulationData(params), [params]);
  const metrics = useMemo(
    () => calculateMetrics(points, params),
    [points, params]
  );

  const handleSelectPreset = (presetKey: string) => {
    const preset = PRESET_SCENARIOS[presetKey];
    if (preset) {
      setParams(preset.params);
      setActivePreset(presetKey);
    }
  };

  const handleUpdateParams = (next: SimulationParams) => {
    setParams(next);
    setActivePreset('custom');
  };

  const handleResetDefaults = () => {
    setParams(DEFAULT_PARAMS);
    setActivePreset('default');
  };

  const handleDownloadSuccess = (filename: string) => {
    setExportStatusMsg(`Success! Graph saved as '${filename}' (300 DPI equivalent)`);
    window.setTimeout(() => setExportStatusMsg(null), 5000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#workbench"
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            IRCTC Tatkal Load Simulator
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#workbench"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Load Graph
            </a>
            <a
              href="#idea-review"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Idea Review
            </a>
            <a
              href="#zone-schedule"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Zone Schedule
            </a>
            <a
              href="#python-script"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Python Script
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('python-script')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Export Script & Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Header + 4-Column KPI Summary Strip */}
        <section id="workbench" className="scroll-mt-20 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="text-xs font-semibold text-sky-700 font-mono">
                PROPOSED & MODELED BY SIDHANTA RAJ · 08:00 TO 13:00 IST (301-MINUTE GAUSSIAN MODEL)
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                IRCTC Tatkal: Current Load vs Zone-Wise Time Splitting
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                System capacity proposal by <strong>Sidhanta Raj</strong> evaluating why All-India 10:00 AM (AC) and 11:00 AM (Non-AC) booking windows exceed the{' '}
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatNumber(params.serverCapacity)}
                </span>{' '}
                concurrent request crash limit, and how splitting Tatkal openings across East, West, North, and South railway zones keeps peak traffic safely under capacity.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <div className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-mono">
                Author & System Architect: <strong>Sidhanta Raj</strong>
              </div>
              {exportStatusMsg && (
                <div
                  role="status"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-semibold text-emerald-800"
                >
                  {exportStatusMsg}
                </div>
              )}
            </div>
          </div>

          {/* 4-Column KPI Strip (Full-Width Row, Single-Elevation Depth, Tabular Numerals) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-500">
                Current System Peak ({metrics.peakCurrentTime} IST)
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-red-700">
                {formatNumber(metrics.peakCurrentLoad)} req
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-red-700">
                ▲ CRASH (+
                {(
                  ((metrics.peakCurrentLoad - params.serverCapacity) /
                    params.serverCapacity) *
                  100
                ).toFixed(0)}
                % over limit)
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-500">
                Zone-Wise Idea Peak ({metrics.peakProposedTime} IST)
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {formatNumber(metrics.peakProposedLoad)} req
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-emerald-700">
                {metrics.isProposedSafe
                  ? `● SAFE (${Math.abs(
                      ((params.serverCapacity - metrics.peakProposedLoad) /
                        params.serverCapacity) *
                        100
                    ).toFixed(0)}% headroom buffer)`
                  : '▲ EXCEEDS LIMIT'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-500">
                Peak Concurrency Reduction
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                -{metrics.peakReductionPercent.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
                Saves{' '}
                {formatNumber(
                  metrics.peakCurrentLoad - metrics.peakProposedLoad
                )}{' '}
                concurrent req
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-500">
                Server Crash Duration (08:00–13:00)
              </div>
              <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {metrics.currentOverloadMinutes} min →{' '}
                <span className="text-emerald-700">
                  {metrics.proposedOverloadMinutes} min
                </span>
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
                {formatNumber(metrics.currentExcessRequestMinutes)} excess req-min eliminated
              </div>
            </div>
          </div>

          {/* Two-Zone Sandbox Layout: Left Interactive Graph Stage (65%) + Right Control Deck (35%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <LoadGraphCanvas
                points={points}
                params={params}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onDownloadSuccess={handleDownloadSuccess}
              />

              {/* Mathematical Model Summary Card */}
              <div
                id="methodology"
                className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-5"
              >
                <h2 className="text-base font-bold text-slate-900 mb-2">
                  01. Gaussian Traffic Spike Formulation (Modeled by Sidhanta Raj)
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Each Tatkal opening window generates a sharp Gaussian burst centered at slot index{' '}
                  <code className="font-mono text-slate-900">center_idx</code> with peak amplitude{' '}
                  <code className="font-mono text-slate-900">H</code> and dispersion width{' '}
                  <code className="font-mono text-slate-900">σ</code> (in minutes) superimposed on a steady base traffic of{' '}
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatNumber(params.baseTraffic)}
                  </span>{' '}
                  requests:
                </p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto tabular-nums">
                  L(x) = base_traffic + Σ H_i · exp( -0.5 · ((x - center_idx_i) / width_i)² )
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <ControlDeck
                params={params}
                activePreset={activePreset}
                onSelectPreset={handleSelectPreset}
                onUpdateParams={handleUpdateParams}
                onResetDefaults={handleResetDefaults}
              />
            </div>
          </div>
        </section>

        {/* System Architecture Evaluation Section (in Clean English) */}
        <section
          id="idea-review"
          className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs font-medium text-emerald-700">
                System Architecture Verdict · Load Balancing & Sharding Analysis · Proposal by Sidhanta Raj
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Architectural Evaluation of Zone-Wise Time Splitting
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                In distributed systems engineering, staggering regional booking windows implements <strong>Temporal Load Shaping + Geographic Sharding</strong>, eliminating synchronized nationwide traffic storms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Print / Save Full UI as PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-mono font-semibold text-emerald-700">
                STRENGTH 01 · ZERO EXTRA HARDWARE COST
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                73.8% Peak Load Reduction Without Over-Provisioning
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provisioning 3.5M-capacity clusters solely for a 10-minute morning burst leaves infrastructure idle for the remaining 23 hours. Staggering into 4 regional slots keeps peak load at <strong>800,000 req</strong> (80% utilization) on existing 1M-capacity servers.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-mono font-semibold text-emerald-700">
                STRENGTH 02 · DATABASE LOCK ISOLATION
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Eliminates Nationwide Seat-Inventory Contention
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under the current model, all trains across East, West, North, and South zones undergo simultaneous row-level locking and payment gateway callbacks at 10:00 and 11:00 AM. Regional slots isolate database transactions to one zone at a time.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-mono font-semibold text-amber-700">
                IMPLEMENTATION · 2 EDGE CASES TO HANDLE
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Cross-Zone Trains & AC/Non-AC Sub-Slots
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>1. Originating Zone Rule:</strong> For cross-country trains (e.g., Howrah to Mumbai), the <em>originating station&apos;s railway zone</em> determines the Tatkal opening slot for the entire train.
                <br />
                <strong>2. Sub-Slot Split:</strong> Splitting AC (<strong>XX:00</strong>) and Non-AC (<strong>XX:30</strong>) within each zone cuts peak concurrency further to ~450,000 req.
              </p>
            </div>
          </div>
        </section>

        {/* Slot Breakdown & Minute Overload Matrix */}
        <SlotBreakdownTable slotSummaries={metrics.slotSummaries} points={points} />

        {/* Synced Python Matplotlib Script & CSV Exporter */}
        <PythonCodePanel params={params} points={points} />
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            Proposed & Modeled by Sidhanta Raj · IRCTC Tatkal Zone-Wise Time Splitting Architecture
          </span>
          <span className="font-mono tabular-nums">
            Author Credit: Sidhanta Raj · Time Range: 08:00–13:00 IST (301 Points)
          </span>
        </div>
      </footer>
    </div>
  );
}
