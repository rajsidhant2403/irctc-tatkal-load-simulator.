export interface SpikeConfig {
  id: string;
  label: string;
  exampleCity: string;
  railwayZones: string;
  timeStr: string;
  centerIdx: number;
  height: number;
  width: number;
  enabled: boolean;
}

export interface SimulationParams {
  baseTraffic: number;
  serverCapacity: number;
  currentSpikes: {
    ac10amHeight: number;
    ac10amWidth: number;
    nonAc11amHeight: number;
    nonAc11amWidth: number;
  };
  zoneSpikes: SpikeConfig[];
}

export interface TimePoint {
  index: number;
  timeStr: string;
  currentLoad: number;
  proposedLoad: number;
  serverCapacity: number;
  currentOverload: number;
  proposedOverload: number;
  isCurrentCrash: boolean;
  isProposedCrash: boolean;
}

export interface SlotSummary {
  timeStr: string;
  index: number;
  currentSlotLabel: string;
  zoneSlotLabel: string;
  exampleCity: string;
  railwayZones: string;
  currentLoad: number;
  proposedLoad: number;
  currentUtilizationPct: number;
  proposedUtilizationPct: number;
  currentReductionPct: number;
  currentStatus: 'CRASH' | 'ELEVATED' | 'NOMINAL';
  proposedStatus: 'CRASH' | 'ELEVATED' | 'NOMINAL';
}

export interface SimulationMetrics {
  peakCurrentLoad: number;
  peakCurrentTime: string;
  peakProposedLoad: number;
  peakProposedTime: string;
  peakReductionPercent: number;
  currentOverloadMinutes: number;
  proposedOverloadMinutes: number;
  currentExcessRequestMinutes: number;
  proposedExcessRequestMinutes: number;
  headroomAtPeakProposed: number;
  isProposedSafe: boolean;
  slotSummaries: SlotSummary[];
}

export const DEFAULT_PARAMS: SimulationParams = {
  baseTraffic: 50000.0,
  serverCapacity: 1000000.0,
  currentSpikes: {
    ac10amHeight: 2500000.0,
    ac10amWidth: 1.5,
    nonAc11amHeight: 3000000.0,
    nonAc11amWidth: 1.5,
  },
  zoneSpikes: [
    {
      id: 'east',
      label: 'East Zone',
      exampleCity: 'Bhubaneswar / Kolkata',
      railwayZones: 'ER, SER, ECoR, NFR',
      timeStr: '09:00',
      centerIdx: 60,
      height: 600000.0,
      width: 2.0,
      enabled: true,
    },
    {
      id: 'west',
      label: 'West Zone',
      exampleCity: 'Pune / Mumbai / Ahmedabad',
      railwayZones: 'CR, WR, WCR, NWR',
      timeStr: '10:00',
      centerIdx: 120,
      height: 700000.0,
      width: 2.0,
      enabled: true,
    },
    {
      id: 'north',
      label: 'North Zone',
      exampleCity: 'New Delhi / Lucknow',
      railwayZones: 'NR, NCR, NER, ECR',
      timeStr: '11:00',
      centerIdx: 180,
      height: 750000.0,
      width: 2.0,
      enabled: true,
    },
    {
      id: 'south',
      label: 'South Zone',
      exampleCity: 'Chennai / Bengaluru / Secunderabad',
      railwayZones: 'SR, SCR, SWR, SECR',
      timeStr: '12:00',
      centerIdx: 240,
      height: 650000.0,
      width: 2.0,
      enabled: true,
    },
  ],
};

export const PRESET_SCENARIOS: Record<
  string,
  { name: string; description: string; params: SimulationParams }
> = {
  default: {
    name: 'Original Script Defaults',
    description: 'Exact parameters from the Python matplotlib model (10 & 11 AM Crash vs 4-Zone Split).',
    params: DEFAULT_PARAMS,
  },
  festivalRush: {
    name: 'Diwali / Chhath Rush (1.2x Demand)',
    description: '20% surge across all zones during peak festive travel while staying below the 1M crash limit.',
    params: {
      baseTraffic: 60000.0,
      serverCapacity: 1000000.0,
      currentSpikes: {
        ac10amHeight: 3000000.0,
        ac10amWidth: 1.8,
        nonAc11amHeight: 3600000.0,
        nonAc11amWidth: 1.8,
      },
      zoneSpikes: [
        {
          ...DEFAULT_PARAMS.zoneSpikes[0],
          height: 720000.0,
          width: 2.2,
        },
        {
          ...DEFAULT_PARAMS.zoneSpikes[1],
          height: 840000.0,
          width: 2.2,
        },
        {
          ...DEFAULT_PARAMS.zoneSpikes[2],
          height: 900000.0,
          width: 2.2,
        },
        {
          ...DEFAULT_PARAMS.zoneSpikes[3],
          height: 780000.0,
          width: 2.2,
        },
      ],
    },
  },
  broadWindow: {
    name: 'Staggered Queue Dispersion (σ = 4 min)',
    description: 'Wider Gaussian dispersion window (width = 4.0 min) making spikes broader and smoother.',
    params: {
      baseTraffic: 50000.0,
      serverCapacity: 1000000.0,
      currentSpikes: {
        ac10amHeight: 2500000.0,
        ac10amWidth: 4.0,
        nonAc11amHeight: 3000000.0,
        nonAc11amWidth: 4.0,
      },
      zoneSpikes: DEFAULT_PARAMS.zoneSpikes.map((z) => ({
        ...z,
        width: 4.0,
      })),
    },
  },
};

/**
 * Exact Python time_str generator:
 * [f"{h:02d}:{m:02d}" for h in range(8, 14) for m in range(60)][:301]
 */
export function generateTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = 8; h < 14; h++) {
    for (let m = 0; m < 60; m++) {
      if (labels.length < 301) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        labels.push(`${hh}:${mm}`);
      }
    }
  }
  return labels;
}

/**
 * Exact Gaussian spike function from Python script:
 * height * np.exp(-0.5 * ((x - center_idx) / width) ** 2)
 */
export function createSpike(
  x: number,
  centerIdx: number,
  height: number,
  width: number
): number {
  if (width <= 0) return 0;
  const z = (x - centerIdx) / width;
  return height * Math.exp(-0.5 * z * z);
}

/**
 * Generates the 301 minute-by-minute data points (08:00 to 13:00).
 */
export function generateSimulationData(params: SimulationParams): TimePoint[] {
  const timeLabels = generateTimeLabels();
  const idx10am = 120;
  const idx11am = 180;

  return timeLabels.map((timeStr, x) => {
    let currentLoad = params.baseTraffic;
    currentLoad += createSpike(
      x,
      idx10am,
      params.currentSpikes.ac10amHeight,
      params.currentSpikes.ac10amWidth
    );
    currentLoad += createSpike(
      x,
      idx11am,
      params.currentSpikes.nonAc11amHeight,
      params.currentSpikes.nonAc11amWidth
    );

    let proposedLoad = params.baseTraffic;
    for (const zone of params.zoneSpikes) {
      if (zone.enabled) {
        proposedLoad += createSpike(x, zone.centerIdx, zone.height, zone.width);
      }
    }

    const currentOverload = Math.max(0, currentLoad - params.serverCapacity);
    const proposedOverload = Math.max(0, proposedLoad - params.serverCapacity);

    return {
      index: x,
      timeStr,
      currentLoad,
      proposedLoad,
      serverCapacity: params.serverCapacity,
      currentOverload,
      proposedOverload,
      isCurrentCrash: currentLoad > params.serverCapacity,
      isProposedCrash: proposedLoad > params.serverCapacity,
    };
  });
}

function classifyStatus(
  load: number,
  capacity: number
): 'CRASH' | 'ELEVATED' | 'NOMINAL' {
  if (load > capacity) return 'CRASH';
  if (load >= capacity * 0.85) return 'ELEVATED';
  return 'NOMINAL';
}

export function calculateMetrics(
  points: TimePoint[],
  params: SimulationParams
): SimulationMetrics {
  let peakCurrentLoad = 0;
  let peakCurrentTime = '08:00';
  let peakProposedLoad = 0;
  let peakProposedTime = '08:00';
  let currentOverloadMinutes = 0;
  let proposedOverloadMinutes = 0;
  let currentExcessRequestMinutes = 0;
  let proposedExcessRequestMinutes = 0;

  for (const pt of points) {
    if (pt.currentLoad > peakCurrentLoad) {
      peakCurrentLoad = pt.currentLoad;
      peakCurrentTime = pt.timeStr;
    }
    if (pt.proposedLoad > peakProposedLoad) {
      peakProposedLoad = pt.proposedLoad;
      peakProposedTime = pt.timeStr;
    }
    if (pt.isCurrentCrash) {
      currentOverloadMinutes += 1;
      currentExcessRequestMinutes += pt.currentOverload;
    }
    if (pt.isProposedCrash) {
      proposedOverloadMinutes += 1;
      proposedExcessRequestMinutes += pt.proposedOverload;
    }
  }

  const peakReductionPercent =
    peakCurrentLoad > 0
      ? ((peakCurrentLoad - peakProposedLoad) / peakCurrentLoad) * 100
      : 0;

  const slotIndices = [
    {
      index: 60,
      timeStr: '09:00',
      currentSlotLabel: 'Idle Window (Pre-Tatkal)',
      zone: params.zoneSpikes[0],
    },
    {
      index: 120,
      timeStr: '10:00',
      currentSlotLabel: 'All-India AC Classes (1A/2A/3A/CC)',
      zone: params.zoneSpikes[1],
    },
    {
      index: 180,
      timeStr: '11:00',
      currentSlotLabel: 'All-India Non-AC Classes (SL/2S)',
      zone: params.zoneSpikes[2],
    },
    {
      index: 240,
      timeStr: '12:00',
      currentSlotLabel: 'Post-Tatkal Normal Window',
      zone: params.zoneSpikes[3],
    },
  ];

  const slotSummaries: SlotSummary[] = slotIndices.map((slot) => {
    const pt = points[slot.index] ?? points[0];
    const currentUtilizationPct =
      params.serverCapacity > 0
        ? (pt.currentLoad / params.serverCapacity) * 100
        : 0;
    const proposedUtilizationPct =
      params.serverCapacity > 0
        ? (pt.proposedLoad / params.serverCapacity) * 100
        : 0;
    const currentReductionPct =
      pt.currentLoad > 0
        ? ((pt.currentLoad - pt.proposedLoad) / pt.currentLoad) * 100
        : 0;

    return {
      timeStr: slot.timeStr,
      index: slot.index,
      currentSlotLabel: slot.currentSlotLabel,
      zoneSlotLabel: slot.zone.enabled ? slot.zone.label : `${slot.zone.label} (Disabled)`,
      exampleCity: slot.zone.exampleCity,
      railwayZones: slot.zone.railwayZones,
      currentLoad: pt.currentLoad,
      proposedLoad: pt.proposedLoad,
      currentUtilizationPct,
      proposedUtilizationPct,
      currentReductionPct,
      currentStatus: classifyStatus(pt.currentLoad, params.serverCapacity),
      proposedStatus: classifyStatus(pt.proposedLoad, params.serverCapacity),
    };
  });

  return {
    peakCurrentLoad,
    peakCurrentTime,
    peakProposedLoad,
    peakProposedTime,
    peakReductionPercent,
    currentOverloadMinutes,
    proposedOverloadMinutes,
    currentExcessRequestMinutes,
    proposedExcessRequestMinutes,
    headroomAtPeakProposed: params.serverCapacity - peakProposedLoad,
    isProposedSafe: peakProposedLoad <= params.serverCapacity,
    slotSummaries,
  };
}

/**
 * Generates the live-synced Python Matplotlib script matching the user's code structure.
 */
export function generatePythonScript(params: SimulationParams): string {
  const z0 = params.zoneSpikes[0];
  const z1 = params.zoneSpikes[1];
  const z2 = params.zoneSpikes[2];
  const z3 = params.zoneSpikes[3];

  return `# ==============================================================================
# IRCTC Tatkal Load Balancing: Zone-Wise Time Splitting Architecture
# Proposed & Modeled by: Sidhanta Raj
# ==============================================================================
import numpy as np
import matplotlib.pyplot as plt

# Time range (08:00 se 13:00)
time_str = [f"{h:02d}:{m:02d}" for h in range(8, 14) for m in range(60)][:301]
x = np.arange(len(time_str))

def create_spike(x, center_idx, height, width):
    return height * np.exp(-0.5 * ((x - center_idx) / width) ** 2)

# Server ka base traffic (Float mein taaki error na aaye)
base_traffic = ${params.baseTraffic.toFixed(1)}

# Time indices (har 60 mins ka slot)
idx_9am = 60
idx_10am = 120
idx_11am = 180
idx_12pm = 240

# --- SCENARIO 1: Current System (Red Spikes) ---
current_load = np.full(len(x), base_traffic)
current_load += create_spike(x, idx_10am, ${params.currentSpikes.ac10amHeight.toFixed(1)}, ${params.currentSpikes.ac10amWidth}) # 10 AM (AC)
current_load += create_spike(x, idx_11am, ${params.currentSpikes.nonAc11amHeight.toFixed(1)}, ${params.currentSpikes.nonAc11amWidth}) # 11 AM (Non-AC)

# --- SCENARIO 2: Zone-Wise Idea by Sidhanta Raj (Green Spikes) ---
proposed_load = np.full(len(x), base_traffic)
${z0.enabled ? `proposed_load += create_spike(x, idx_9am, ${z0.height.toFixed(1)}, ${z0.width})   # East Zone (e.g., Bhubaneswar)` : `# East Zone disabled`}
${z1.enabled ? `proposed_load += create_spike(x, idx_10am, ${z1.height.toFixed(1)}, ${z1.width})  # West Zone (e.g., Pune)` : `# West Zone disabled`}
${z2.enabled ? `proposed_load += create_spike(x, idx_11am, ${z2.height.toFixed(1)}, ${z2.width})  # North Zone (e.g., Delhi)` : `# North Zone disabled`}
${z3.enabled ? `proposed_load += create_spike(x, idx_12pm, ${z3.height.toFixed(1)}, ${z3.width})  # South Zone (e.g., Chennai)` : `# South Zone disabled`}

# --- Graph Plotting ---
plt.figure(figsize=(12, 6))

# Dono lines draw karna
plt.plot(x, current_load, color='red', label='Current System (10 & 11 AM Crash)', linewidth=2.5)
plt.plot(x, proposed_load, color='green', label='Zone-Wise Idea (Safe Load)', linewidth=2.5)

# Server Capacity Limit
server_capacity = ${params.serverCapacity.toFixed(1)}
plt.axhline(y=server_capacity, color='black', linestyle='--', label='Server Crash Limit')
plt.fill_between(x, current_load, server_capacity, where=(current_load > server_capacity), color='red', alpha=0.3)

# UI Settings & Author Watermark
plt.xticks(x[::30], time_str[::30])
plt.title("IRCTC Tatkal: Current Load vs Zone-Wise Time Splitting (Proposed by Sidhanta Raj)", fontsize=13, fontweight='bold')
plt.xlabel("Time of Day", fontsize=12, fontweight='bold')
plt.ylabel("Concurrent Server Requests", fontsize=12, fontweight='bold')
plt.legend(fontsize=11)
plt.grid(True, linestyle=':', alpha=0.7)
plt.figtext(0.99, 0.01, "Architecture & Simulation by Sidhanta Raj", ha="right", fontsize=9, fontweight="bold", color="#334155")
plt.tight_layout()

# Image file save karna
plt.savefig('zone_wise_graph.png', dpi=300)
print("Success! Graph saved as 'zone_wise_graph.png'")`;
}

/**
 * Generates CSV content for downloading the 301-point dataset.
 */
export function generateCsvData(points: TimePoint[]): string {
  const header =
    'Minute_Index,Time_Of_Day,Current_System_Load,Zone_Wise_Proposed_Load,Server_Capacity_Limit,Current_Overload_Requests';
  const rows = points.map(
    (p) =>
      `${p.index},${p.timeStr},${Math.round(p.currentLoad)},${Math.round(
        p.proposedLoad
      )},${Math.round(p.serverCapacity)},${Math.round(p.currentOverload)}`
  );
  return [header, ...rows].join('\n');
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatCompactMillions(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(0)}K`;
  }
  return String(Math.round(n));
}
