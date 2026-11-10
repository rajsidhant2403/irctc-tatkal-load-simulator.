import React, { useState } from 'react';
import {
  SimulationParams,
  TimePoint,
  generatePythonScript,
  generateCsvData,
} from '../utils/simulation';
import { Copy, Check, FileSpreadsheet, Terminal } from 'lucide-react';

interface PythonCodePanelProps {
  params: SimulationParams;
  points: TimePoint[];
}

export const PythonCodePanel: React.FC<PythonCodePanelProps> = ({
  params,
  points,
}) => {
  const [copied, setCopied] = useState(false);
  const pythonCode = generatePythonScript(params);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pythonCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = generateCsvData(points);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'irctc_tatkal_zone_wise_simulation.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="python-script"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-slate-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              03. Live-Synced Python Matplotlib Script & Dataset Export
            </h2>
            <p className="text-xs text-slate-600">
              Automatically updates as you adjust sliders so you can run it locally or export the 301-minute CSV
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download CSV (301 Rows)
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied Python Script
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Python Script
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
        <code>{pythonCode}</code>
      </pre>
    </section>
  );
};
