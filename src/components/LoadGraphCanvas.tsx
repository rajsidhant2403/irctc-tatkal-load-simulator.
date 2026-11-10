import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SimulationParams,
  TimePoint,
  createSpike,
  formatNumber,
  formatCompactMillions,
} from '../utils/simulation';
import { Download, ZoomIn, RotateCcw, Play, Pause } from 'lucide-react';

export type ChartViewMode = 'full' | 'zoom-10am' | 'zoom-11am' | 'four-slot-grid';

interface LoadGraphCanvasProps {
  points: TimePoint[];
  params: SimulationParams;
  viewMode: ChartViewMode;
  onViewModeChange: (mode: ChartViewMode) => void;
  onDownloadSuccess: (filename: string) => void;
}

export const LoadGraphCanvas: React.FC<LoadGraphCanvasProps> = ({
  points,
  params,
  viewMode,
  onViewModeChange,
  onDownloadSuccess,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(180); // Default highlight 11:00 AM peak
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Playback scrubber for time-of-day simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setHoverIdx((prev) => {
        const next = prev === null ? 0 : prev + 1;
        if (next > 300) {
          setIsPlaying(false);
          return 180;
        }
        return next;
      });
    }, 45);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  // Continuous interpolation helper so Gaussian curves look ultra-crisp
  const evaluateAtContinuousX = useCallback(
    (xVal: number) => {
      let current = params.baseTraffic;
      current += createSpike(
        xVal,
        120,
        params.currentSpikes.ac10amHeight,
        params.currentSpikes.ac10amWidth
      );
      current += createSpike(
        xVal,
        180,
        params.currentSpikes.nonAc11amHeight,
        params.currentSpikes.nonAc11amWidth
      );

      let proposed = params.baseTraffic;
      for (const z of params.zoneSpikes) {
        if (z.enabled) {
          proposed += createSpike(xVal, z.centerIdx, z.height, z.width);
        }
      }
      return { current, proposed };
    },
    [params]
  );

  // Determine active X range [minX, maxX] based on viewMode
  const getRange = useCallback((): [number, number] => {
    if (viewMode === 'zoom-10am') return [105, 135]; // 09:45 to 10:15
    if (viewMode === 'zoom-11am') return [165, 195]; // 10:45 to 11:15
    return [0, 300]; // 08:00 to 13:00
  }, [viewMode]);

  const drawGraphOnCanvas = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      minX: number,
      maxX: number,
      activeHoverIdx: number | null,
      isExport: boolean
    ) => {
      // Clear background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const padLeft = Math.round(width * 0.14);
      const padRight = Math.round(width * 0.035);
      const padTop = Math.round(height * 0.13);
      const padBottom = Math.round(height * 0.14);

      const plotW = width - padLeft - padRight;
      const plotH = height - padTop - padBottom;

      // Determine Y max
      const peakVal = Math.max(
        params.serverCapacity * 1.25,
        params.baseTraffic + params.currentSpikes.ac10amHeight,
        params.baseTraffic + params.currentSpikes.nonAc11amHeight,
        ...params.zoneSpikes.map((z) =>
          z.enabled ? params.baseTraffic + z.height : 0
        ),
        3200000
      );
      const maxY = Math.ceil(peakVal / 500000) * 500000;

      const xToPx = (x: number) =>
        padLeft + ((x - minX) / (maxX - minX)) * plotW;
      const yToPx = (y: number) =>
        padTop + plotH - (Math.min(y, maxY) / maxY) * plotH;

      // 1. Title & Author Attribution Stamp
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${Math.round(height * 0.038)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'IRCTC Tatkal: Current Load vs Zone-Wise Time Splitting',
        padLeft + plotW / 2,
        Math.round(padTop * 0.38)
      );

      ctx.fillStyle = '#0284C7';
      ctx.font = `600 ${Math.round(height * 0.023)}px "JetBrains Mono", monospace`;
      ctx.fillText(
        'PROPOSED & MODELED BY SIDHANTA RAJ · SYSTEM CAPACITY ARCHITECTURE',
        padLeft + plotW / 2,
        Math.round(padTop * 0.74)
      );

      // 2. Dotted Grid Lines (plt.grid(True, linestyle=':', alpha=0.7))
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = Math.max(1, width / 900);
      ctx.setLineDash([3, 3]);

      const yStep = 500000;
      for (let yVal = 0; yVal <= maxY; yVal += yStep) {
        const py = yToPx(yVal);
        ctx.beginPath();
        ctx.moveTo(padLeft, py);
        ctx.lineTo(padLeft + plotW, py);
        ctx.stroke();

        // Y-axis tick label
        ctx.fillStyle = '#334155';
        ctx.font = `500 ${Math.round(height * 0.025)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatNumber(yVal), padLeft - 12, py);
      }

      // X-axis ticks (every 30 mins in full mode, every 5 mins in zoom mode)
      const xStep = maxX - minX <= 40 ? 5 : 30;
      for (let xVal = minX; xVal <= maxX; xVal += xStep) {
        const px = xToPx(xVal);
        ctx.beginPath();
        ctx.moveTo(px, padTop);
        ctx.lineTo(px, padTop + plotH);
        ctx.stroke();

        const label = points[xVal]?.timeStr ?? '';
        ctx.fillStyle = '#334155';
        ctx.font = `600 ${Math.round(height * 0.026)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, px, padTop + plotH + 10);
      }
      ctx.setLineDash([]);

      // 3. Plot Frame Border
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = Math.max(1.2, width / 800);
      ctx.strokeRect(padLeft, padTop, plotW, plotH);

      // 4. Shaded Red Crash Fill: plt.fill_between(x, current_load, server_capacity, where=(current_load > server_capacity), color='red', alpha=0.3)
      const steps = 900;
      const capY = yToPx(params.serverCapacity);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.26)';
      ctx.beginPath();
      let inOverload = false;
      for (let i = 0; i <= steps; i++) {
        const xVal = minX + (i / steps) * (maxX - minX);
        const { current } = evaluateAtContinuousX(xVal);
        const px = xToPx(xVal);
        if (current > params.serverCapacity) {
          const py = yToPx(current);
          if (!inOverload) {
            ctx.moveTo(px, capY);
            inOverload = true;
          }
          ctx.lineTo(px, py);
        } else if (inOverload) {
          ctx.lineTo(px, capY);
          inOverload = false;
        }
      }
      if (inOverload) {
        ctx.lineTo(xToPx(maxX), capY);
      }
      ctx.closePath();
      ctx.fill();

      // 5. Server Capacity Limit Line: plt.axhline(y=server_capacity, color='black', linestyle='--', label='Server Crash Limit')
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = Math.max(2, width / 550);
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(padLeft, capY);
      ctx.lineTo(padLeft + plotW, capY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Capacity inline annotation on right side with white halo
      const capLabel = `CRASH LIMIT: ${formatNumber(params.serverCapacity)} req`;
      ctx.font = `600 ${Math.round(height * 0.023)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 4;
      ctx.strokeText(capLabel, padLeft + plotW - 10, capY - 6);
      ctx.fillStyle = '#0F172A';
      ctx.fillText(capLabel, padLeft + plotW - 10, capY - 6);

      // 6. Plot Current System (Red Line, linewidth=2.5)
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = Math.max(2.5, width / 420);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const xVal = minX + (i / steps) * (maxX - minX);
        const { current } = evaluateAtContinuousX(xVal);
        const px = xToPx(xVal);
        const py = yToPx(current);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // 7. Plot Proposed Zone-Wise System (Green Line, linewidth=2.5)
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = Math.max(2.5, width / 420);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const xVal = minX + (i / steps) * (maxX - minX);
        const { proposed } = evaluateAtContinuousX(xVal);
        const px = xToPx(xVal);
        const py = yToPx(proposed);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // 8. Peak Callout Labels directly on canvas with crisp white halo
      const slotAnnotations = [
        {
          x: 60,
          title: '09:00 East (Bhubaneswar)',
          yVal: evaluateAtContinuousX(60).proposed,
          color: '#15803D',
        },
        {
          x: 120,
          title: '10:00 AC Crash',
          yVal: evaluateAtContinuousX(120).current,
          color: '#DC2626',
        },
        {
          x: 120,
          title: '10:00 West (Pune)',
          yVal: evaluateAtContinuousX(120).proposed,
          color: '#15803D',
        },
        {
          x: 180,
          title: '11:00 Non-AC Crash',
          yVal: evaluateAtContinuousX(180).current,
          color: '#DC2626',
        },
        {
          x: 180,
          title: '11:00 North (Delhi)',
          yVal: evaluateAtContinuousX(180).proposed,
          color: '#15803D',
        },
        {
          x: 240,
          title: '12:00 South (Chennai)',
          yVal: evaluateAtContinuousX(240).proposed,
          color: '#15803D',
        },
      ];

      for (const ann of slotAnnotations) {
        if (ann.x >= minX && ann.x <= maxX) {
          const px = xToPx(ann.x);
          const py = yToPx(ann.yVal);
          ctx.fillStyle = ann.color;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(4, width / 260), 0, Math.PI * 2);
          ctx.fill();

          const text = `${ann.title} (${formatCompactMillions(ann.yVal)})`;
          ctx.font = `600 ${Math.round(height * 0.022)}px "Plus Jakarta Sans", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
          ctx.lineWidth = 4.5;
          ctx.strokeText(text, px, py - 8);
          ctx.fillStyle = ann.color;
          ctx.fillText(text, px, py - 8);
        }
      }

      // 9. Interactive Crosshair (only on screen, not in exported PNG)
      if (
        !isExport &&
        activeHoverIdx !== null &&
        activeHoverIdx >= minX &&
        activeHoverIdx <= maxX
      ) {
        const hx = xToPx(activeHoverIdx);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(hx, padTop);
        ctx.lineTo(hx, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 10. Legend Box (Top-Right inside plot area in open 11:35-13:00 upper space)
      const legW = Math.round(plotW * 0.285);
      const legH = Math.round(plotH * 0.19);
      const legX = padLeft + plotW - legW - 12;
      const legY = padTop + 12;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.fillRect(legX, legY, legW, legH);
      ctx.strokeRect(legX, legY, legW, legH);

      const legItems = [
        {
          color: '#DC2626',
          dashed: false,
          label: 'Current System (10 & 11 AM Crash)',
        },
        {
          color: '#15803D',
          dashed: false,
          label: 'Zone-Wise Idea (Safe Load)',
        },
        {
          color: '#0F172A',
          dashed: true,
          label: 'Server Crash Limit',
        },
      ];

      legItems.forEach((item, idx) => {
        const rowY = legY + ((idx + 0.65) * legH) / 3.2;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = Math.max(2.5, width / 450);
        if (item.dashed) ctx.setLineDash([6, 4]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(legX + 10, rowY);
        ctx.lineTo(legX + 32, rowY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#0F172A';
        ctx.font = `500 ${Math.round(height * 0.02)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, legX + 38, rowY);
      });

      // 11. Axis Titles & Bottom-Right Author Watermark Signature
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${Math.round(height * 0.029)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        'Time of Day (08:00 to 13:00 IST)',
        padLeft + plotW / 2,
        height - Math.round(padBottom * 0.14)
      );

      ctx.fillStyle = '#334155';
      ctx.font = `600 ${Math.round(height * 0.02)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        'Author & Architect: Sidhanta Raj',
        padLeft + plotW,
        height - Math.round(padBottom * 0.14)
      );

      ctx.save();
      ctx.translate(Math.round(padLeft * 0.14), padTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 ${Math.round(height * 0.03)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Concurrent Server Requests', 0, 0);
      ctx.restore();
    },
    [evaluateAtContinuousX, params, points]
  );

  // Render on-screen canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode === 'four-slot-grid') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [minX, maxX] = getRange();
    drawGraphOnCanvas(
      ctx,
      canvas.width,
      canvas.height,
      minX,
      maxX,
      hoverIdx,
      false
    );
  }, [drawGraphOnCanvas, getRange, hoverIdx, viewMode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const padLeftRatio = 0.14;
    const padRightRatio = 0.035;
    const plotRatio = 1 - padLeftRatio - padRightRatio;
    const norm = Math.max(0, Math.min(1, (relX - padLeftRatio) / plotRatio));
    const [minX, maxX] = getRange();
    const idx = Math.round(minX + norm * (maxX - minX));
    setHoverIdx(idx);
  };

  // Export 300-DPI-equivalent PNG ('zone_wise_graph.png')
  const handleDownloadPng = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 2400;
    offscreen.height = 1200;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    drawGraphOnCanvas(ctx, 2400, 1200, 0, 300, null, true);
    const dataUrl = offscreen.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'zone_wise_graph.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onDownloadSuccess('zone_wise_graph.png');
  };

  // Export Full UI Presentation Board PNG with KPI Cards + Graph + Table + Sidhanta Raj Watermark
  const handleDownloadFullBoardPng = () => {
    const board = document.createElement('canvas');
    board.width = 2400;
    board.height = 1950;
    const ctx = board.getContext('2d');
    if (!ctx) return;

    // Background canvas
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 2400, 1950);

    // Top Header Banner
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 2400, 145);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      'IRCTC TATKAL CAPACITY ARCHITECTURE PROPOSAL · AUTHOR & ARCHITECT: SIDHANTA RAJ',
      70,
      30
    );

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      'IRCTC Tatkal: Current Load vs Zone-Wise Time Splitting',
      70,
      68
    );

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('PROPOSED BY: SIDHANTA RAJ', 2330, 62);

    // 4 KPI Cards Row (y = 180 to 345)
    const peakCurr = Math.max(...points.map((p) => p.currentLoad));
    const peakProp = Math.max(...points.map((p) => p.proposedLoad));
    const reductionPct = (((peakCurr - peakProp) / peakCurr) * 100).toFixed(1);

    const kpiCards = [
      {
        title: 'Current System Peak (11:00 IST)',
        value: `${formatNumber(peakCurr)} req`,
        sub: '▲ CRASH (+205% over 1M limit)',
        color: '#B91C1C',
      },
      {
        title: 'Zone-Wise Idea Peak (11:00 IST)',
        value: `${formatNumber(peakProp)} req`,
        sub: '● SAFE (20% headroom buffer)',
        color: '#15803D',
      },
      {
        title: 'Peak Concurrency Reduction',
        value: `-${reductionPct}%`,
        sub: `Saves ${formatNumber(peakCurr - peakProp)} concurrent req`,
        color: '#0F172A',
      },
      {
        title: 'Server Crash Duration (08:00–13:00)',
        value: '10 min → 0 min',
        sub: '100% crash-free across all 4 zones',
        color: '#15803D',
      },
    ];

    kpiCards.forEach((card, i) => {
      const cx = 70 + i * 575;
      const cy = 180;
      const cw = 535;
      const ch = 160;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeRect(cx, cy, cw, ch);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(card.title, cx + 28, cy + 24);

      ctx.fillStyle = card.color;
      ctx.font = '700 42px "JetBrains Mono", monospace';
      ctx.fillText(card.value, cx + 28, cy + 62);

      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(card.sub, cx + 28, cy + 118);
    });

    // Draw Main Graph Canvas inside the Poster (y = 370 to 1450)
    const graphSubCanvas = document.createElement('canvas');
    graphSubCanvas.width = 2260;
    graphSubCanvas.height = 1060;
    const gCtx = graphSubCanvas.getContext('2d');
    if (gCtx) {
      drawGraphOnCanvas(gCtx, 2260, 1060, 0, 300, null, true);
      ctx.drawImage(graphSubCanvas, 70, 375);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.strokeRect(70, 375, 2260, 1060);
    }

    // Bottom 4-Zone Summary Strip (y = 1470 to 1840)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.fillRect(70, 1470, 2260, 370);
    ctx.strokeRect(70, 1470, 2260, 370);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      'Zone-Wise Time Slot Allocation & Architectural Summary (Proposed by Sidhanta Raj)',
      105,
      1500
    );

    const slots = [
      {
        time: '09:00 AM IST',
        zone: 'East Zone (ER, SER, ECoR, NFR)',
        cities: 'Bhubaneswar / Kolkata / Guwahati',
        curr: '50,000 req (Idle)',
        prop: '650,000 req (65% Load · ● SAFE)',
      },
      {
        time: '10:00 AM IST',
        zone: 'West Zone (CR, WR, WCR, NWR)',
        cities: 'Pune / Mumbai / Ahmedabad',
        curr: '2,550,000 req (▲ 255% CRASH)',
        prop: '750,000 req (75% Load · ● SAFE)',
      },
      {
        time: '11:00 AM IST',
        zone: 'North Zone (NR, NCR, NER, ECR)',
        cities: 'New Delhi / Lucknow / Patna',
        curr: '3,050,000 req (▲ 305% CRASH)',
        prop: '800,000 req (80% Load · ● SAFE)',
      },
      {
        time: '12:00 PM IST',
        zone: 'South Zone (SR, SCR, SWR, SECR)',
        cities: 'Chennai / Bengaluru / Secunderabad',
        curr: '50,000 req (Idle)',
        prop: '700,000 req (70% Load · ● SAFE)',
      },
    ];

    slots.forEach((s, idx) => {
      const sx = 105 + idx * 550;
      const sy = 1560;
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.fillRect(sx, sy, 525, 245);
      ctx.strokeRect(sx, sy, 525, 245);

      ctx.fillStyle = '#0284C7';
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillText(s.time, sx + 22, sy + 22);

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(s.zone, sx + 22, sy + 60);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 19px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(s.cities, sx + 22, sy + 94);

      ctx.fillStyle = '#B91C1C';
      ctx.font = '600 19px "JetBrains Mono", monospace';
      ctx.fillText(`Current: ${s.curr}`, sx + 22, sy + 145);

      ctx.fillStyle = '#15803D';
      ctx.font = '700 19px "JetBrains Mono", monospace';
      ctx.fillText(`Proposed: ${s.prop}`, sx + 22, sy + 185);
    });

    // Footer Signature Bar
    ctx.fillStyle = '#334155';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'ORIGINAL ARCHITECTURE & SIMULATION BY SIDHANTA RAJ · IRCTC TATKAL ZONE-WISE TIME SPLITTING MODEL',
      1200,
      1885
    );

    const dataUrl = board.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'sidhanta_raj_irctc_full_proposal_board.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onDownloadSuccess('sidhanta_raj_irctc_full_proposal_board.png');
  };

  const activePoint =
    hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[180];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      {/* Toolbar: View Switcher + Scrubber + PNG Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          role="group"
          aria-label="Chart zoom mode"
        >
          <button
            type="button"
            onClick={() => onViewModeChange('full')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'full'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Full (08:00–13:00)
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('zoom-10am')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
              viewMode === 'zoom-10am'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            10 AM Zoom
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('zoom-11am')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
              viewMode === 'zoom-11am'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            11 AM Zoom
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('four-slot-grid')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'four-slot-grid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4-Zone Grid
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Play Sweep
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Graph PNG
          </button>
          <button
            type="button"
            onClick={handleDownloadFullBoardPng}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Full UI Board PNG
          </button>
        </div>
      </div>

      {/* Main Canvas or 4-Slot Comparative View */}
      {viewMode !== 'four-slot-grid' ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            data-testid="tatkal-load-canvas"
            onMouseMove={handleMouseMove}
            className="w-full h-auto rounded-lg border border-slate-200 cursor-crosshair bg-white"
          />

          {/* Interactive Scrubber & Live Readout Bar below canvas */}
          {activePoint && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="minute-scrubber"
                  className="font-semibold text-slate-700 whitespace-nowrap"
                >
                  Inspect Time ({activePoint.timeStr} IST):
                </label>
                <input
                  id="minute-scrubber"
                  type="range"
                  min={0}
                  max={300}
                  value={activePoint.index}
                  onChange={(e) => setHoverIdx(Number(e.target.value))}
                  className="w-36 sm:w-52 accent-sky-600 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[60, 120, 180, 240].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHoverIdx(idx)}
                      className={`px-2 py-0.5 font-mono text-[11px] rounded transition-colors whitespace-nowrap shrink-0 ${
                        activePoint.index === idx
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {points[idx]?.timeStr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                <span className="text-red-700 font-semibold">
                  Current: {formatNumber(activePoint.currentLoad)} req{' '}
                  {activePoint.isCurrentCrash ? '▲ CRASH' : '● OK'}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-emerald-700 font-semibold">
                  Zone-Wise: {formatNumber(activePoint.proposedLoad)} req{' '}
                  {activePoint.isProposedCrash ? '▲ CRASH' : '● SAFE'}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-slate-600">
                  Limit: {formatNumber(activePoint.serverCapacity)} req
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              centerIdx: 60,
              timeStr: '09:00 AM',
              zoneTitle: 'East Zone Opening (Bhubaneswar / Kolkata)',
              currentDesc: 'No Tatkal opening in current system (50K base load)',
            },
            {
              centerIdx: 120,
              timeStr: '10:00 AM',
              zoneTitle: 'West Zone Opening (Pune / Mumbai)',
              currentDesc: 'Current System: All-India AC Tatkal Crash (2.55M peak)',
            },
            {
              centerIdx: 180,
              timeStr: '11:00 AM',
              zoneTitle: 'North Zone Opening (Delhi / Lucknow)',
              currentDesc: 'Current System: All-India Non-AC Tatkal Crash (3.05M peak)',
            },
            {
              centerIdx: 240,
              timeStr: '12:00 PM',
              zoneTitle: 'South Zone Opening (Chennai / Bengaluru)',
              currentDesc: 'No Tatkal opening in current system (50K base load)',
            },
          ].map((slot) => {
            const pt = points[slot.centerIdx];
            const currentPct = Math.min(
              100,
              (pt.currentLoad / 3200000) * 100
            );
            const proposedPct = Math.min(
              100,
              (pt.proposedLoad / 3200000) * 100
            );
            const limitPct = Math.min(
              100,
              (params.serverCapacity / 3200000) * 100
            );

            return (
              <div
                key={slot.centerIdx}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/60"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {slot.timeStr} — {slot.zoneTitle}
                  </h3>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    Minute #{slot.centerIdx}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">{slot.currentDesc}</p>

                <div className="space-y-3 font-mono text-xs tabular-nums">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-red-700 font-semibold">
                        Current System: {formatNumber(pt.currentLoad)} req
                      </span>
                      <span className="text-red-700 font-semibold">
                        {pt.isCurrentCrash ? '▲ CRASH OVERLOAD' : '● NOMINAL'}
                      </span>
                    </div>
                    <div className="relative h-3 bg-slate-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-red-600 transition-all duration-150"
                        style={{ width: `${currentPct}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                        style={{ left: `${limitPct}%` }}
                        title="Server Crash Limit"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-emerald-700 font-semibold">
                        Zone-Wise Idea: {formatNumber(pt.proposedLoad)} req
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        {pt.isProposedCrash ? '▲ OVER LIMIT' : '● SAFE LOAD'}
                      </span>
                    </div>
                    <div className="relative h-3 bg-slate-200 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-150"
                        style={{ width: `${proposedPct}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                        style={{ left: `${limitPct}%` }}
                        title="Server Crash Limit"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
