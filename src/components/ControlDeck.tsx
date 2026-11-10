import React from 'react';
import {
  SimulationParams,
  PRESET_SCENARIOS,
  formatNumber,
} from '../utils/simulation';
import { RotateCcw, Sliders } from 'lucide-react';

interface ControlDeckProps {
  params: SimulationParams;
  activePreset: string;
  onSelectPreset: (presetKey: string) => void;
  onUpdateParams: (next: SimulationParams) => void;
  onResetDefaults: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  params,
  activePreset,
  onSelectPreset,
  onUpdateParams,
  onResetDefaults,
}) => {
  const handleZoneSpikeChange = (
    id: string,
    field: 'height' | 'width' | 'enabled',
    value: number | boolean
  ) => {
    const nextZones = params.zoneSpikes.map((z) =>
      z.id === id ? { ...z, [field]: value } : z
    );
    onUpdateParams({
      ...params,
      zoneSpikes: nextZones,
    });
  };

  return (
    <aside
      aria-label="Simulation parameter controls"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-6"
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900">
            Simulation Parameters
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Scenario Presets */}
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Traffic Scenario Presets
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {Object.entries(PRESET_SCENARIOS).map(([key, scenario]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectPreset(key)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                activePreset === key
                  ? 'bg-sky-50/80 border-sky-600 text-slate-900 font-semibold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="whitespace-nowrap truncate">
                  {scenario.name}
                </span>
                {activePreset === key && (
                  <span className="font-mono text-[11px] text-sky-700 shrink-0">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                {scenario.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Infrastructure Baseline */}
      <div className="space-y-4 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-900">
          01. Server Capacity & Base Load
        </h3>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="slider-capacity" className="font-medium text-slate-700">
              Server Crash Limit (server_capacity)
            </label>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatNumber(params.serverCapacity)} req
            </span>
          </div>
          <input
            id="slider-capacity"
            type="range"
            min={500000}
            max={3500000}
            step={50000}
            value={params.serverCapacity}
            onChange={(e) =>
              onUpdateParams({
                ...params,
                serverCapacity: Number(e.target.value),
              })
            }
            className="w-full accent-slate-900 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="slider-base" className="font-medium text-slate-700">
              Base Server Traffic (base_traffic)
            </label>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatNumber(params.baseTraffic)} req
            </span>
          </div>
          <input
            id="slider-base"
            type="range"
            min={10000}
            max={250000}
            step={10000}
            value={params.baseTraffic}
            onChange={(e) =>
              onUpdateParams({
                ...params,
                baseTraffic: Number(e.target.value),
              })
            }
            className="w-full accent-slate-700 cursor-pointer"
          />
        </div>
      </div>

      {/* Scenario 1: Current System Red Spikes */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-bold text-red-700">
          02. Current System (10 & 11 AM Spikes)
        </h3>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="slider-ac-10am" className="font-medium text-slate-700">
              10:00 AM (AC Quota) Spike Height
            </label>
            <span className="font-mono font-semibold text-red-700 tabular-nums">
              +{formatNumber(params.currentSpikes.ac10amHeight)} req
            </span>
          </div>
          <input
            id="slider-ac-10am"
            type="range"
            min={500000}
            max={4000000}
            step={50000}
            value={params.currentSpikes.ac10amHeight}
            onChange={(e) =>
              onUpdateParams({
                ...params,
                currentSpikes: {
                  ...params.currentSpikes,
                  ac10amHeight: Number(e.target.value),
                },
              })
            }
            className="w-full accent-red-600 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="slider-nonac-11am" className="font-medium text-slate-700">
              11:00 AM (Non-AC Quota) Spike Height
            </label>
            <span className="font-mono font-semibold text-red-700 tabular-nums">
              +{formatNumber(params.currentSpikes.nonAc11amHeight)} req
            </span>
          </div>
          <input
            id="slider-nonac-11am"
            type="range"
            min={500000}
            max={4000000}
            step={50000}
            value={params.currentSpikes.nonAc11amHeight}
            onChange={(e) =>
              onUpdateParams({
                ...params,
                currentSpikes: {
                  ...params.currentSpikes,
                  nonAc11amHeight: Number(e.target.value),
                },
              })
            }
            className="w-full accent-red-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Scenario 2: Proposed Zone-Wise Green Spikes */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <h3 className="text-xs font-bold text-emerald-700">
          03. Proposed Zone-Wise Idea (Green Spikes)
        </h3>

        {params.zoneSpikes.map((zone) => (
          <div
            key={zone.id}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zone.enabled}
                  onChange={(e) =>
                    handleZoneSpikeChange(zone.id, 'enabled', e.target.checked)
                  }
                  className="rounded accent-emerald-600"
                />
                <span>
                  {zone.timeStr} — {zone.label}
                </span>
              </label>
              <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                +{formatNumber(zone.enabled ? zone.height : 0)} req
              </span>
            </div>

            <div className="text-[11px] text-slate-500">
              {zone.exampleCity} · {zone.railwayZones}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                aria-label={`${zone.label} spike height`}
                disabled={!zone.enabled}
                min={200000}
                max={1500000}
                step={25000}
                value={zone.height}
                onChange={(e) =>
                  handleZoneSpikeChange(
                    zone.id,
                    'height',
                    Number(e.target.value)
                  )
                }
                className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
