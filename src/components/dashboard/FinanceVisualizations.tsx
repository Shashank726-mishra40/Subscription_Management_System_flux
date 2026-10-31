import React, { useState } from 'react';
import {
  MonthlyRevenuePoint,
  StatusDistributionPoint,
  AgingBucketPoint,
} from '../../services/analyticsService';
import { formatCurrency } from '../../utils/formatters';
import { ShieldCheck } from 'lucide-react';

// 1. Revenue Overview Over Time (Interactive SVG Chart)
export const RevenueOverviewChart: React.FC<{ data: MonthlyRevenuePoint[] }> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
        No payment revenue recorded in this period.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.revenue), 1000) * 1.15;
  const chartHeight = 220;
  const chartWidth = 560;
  const paddingX = 45;
  const paddingY = 25;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / Math.max(1, data.length - 1)) * innerWidth;
  const getY = (val: number) => paddingY + innerHeight - (val / maxVal) * innerHeight;

  // Path data
  const points = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const areaPoints = `${getX(0)},${paddingY + innerHeight} ${points} ${getX(data.length - 1)},${paddingY + innerHeight}`;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
          <span>Realized Revenue (Recorded Payments)</span>
        </div>

        {hoveredIdx !== null ? (
          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            {data[hoveredIdx].month}: {formatCurrency(data[hoveredIdx].revenue)} ({data[hoveredIdx].paymentsCount} receipts)
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Hover data points for details</span>
        )}
      </div>

      <div className="relative w-full aspect-[2.5/1] max-h-[240px]">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingY + innerHeight * r;
            const gridVal = maxVal * (1 - r);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-medium"
                >
                  ${Math.round(gridVal / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polygon points={areaPoints} fill="url(#revGrad)" />

          {/* Stroke Line */}
          <polyline
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.revenue);
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#4f46e5"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />
                <text
                  x={cx}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className={`text-[10px] ${isHovered ? 'fill-indigo-600 font-bold' : 'fill-slate-400'}`}
                >
                  {d.month.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// 2. Active Subscription Overview (Status & Cadence distribution)
export const SubscriptionOverviewVisual: React.FC<{
  statusData: StatusDistributionPoint[];
  cadenceData: StatusDistributionPoint[];
  totalActive: number;
}> = ({ statusData, cadenceData, totalActive }) => {
  return (
    <div className="space-y-5 text-xs">
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-semibold text-slate-700">Contract Status Breakdown</span>
          <span className="text-[11px] text-slate-400 font-medium">{totalActive} Active/Confirmed</span>
        </div>
        {/* Multi-segment progress bar */}
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {statusData.map((s, idx) => (
            <div
              key={idx}
              style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
              title={`${s.status}: ${s.count} (${s.percentage}%)`}
              className="h-full hover:opacity-90 transition-all first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {statusData.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-slate-600 font-medium">
                {s.status}: <strong className="text-slate-800">{s.count}</strong> ({s.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <span className="font-semibold text-slate-700 block mb-2">Billing Frequency Distribution</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {cadenceData.map((c, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">{c.status}</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{c.count}</span>
              <span className="text-[10px] text-indigo-600 font-medium">{c.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Paid vs Outstanding Invoice Summary
export const PaidVsOutstandingVisual: React.FC<{
  data: { totalInvoiced: number; totalCollected: number; totalOutstanding: number };
}> = ({ data }) => {
  const collectionPct =
    data.totalInvoiced > 0 ? Math.round((data.totalCollected / data.totalInvoiced) * 100) : 100;

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-slate-500 block text-[11px]">Realized Collection Efficiency</span>
          <span className="text-2xl font-bold text-slate-900">{collectionPct}%</span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Progress comparison */}
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.min(100, collectionPct)}%` }}
            className="h-full bg-emerald-500 rounded-l-full transition-all"
            title={`Collected: ${formatCurrency(data.totalCollected)}`}
          />
          <div
            style={{ width: `${Math.max(0, 100 - collectionPct)}%` }}
            className="h-full bg-amber-400 rounded-r-full transition-all"
            title={`Outstanding: ${formatCurrency(data.totalOutstanding)}`}
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium">
          <span className="text-emerald-700">Collected: {formatCurrency(data.totalCollected)}</span>
          <span className="text-amber-700">Outstanding: {formatCurrency(data.totalOutstanding)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
          <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Total Invoiced</span>
          <span className="font-bold text-emerald-950 text-sm mt-0.5 block">{formatCurrency(data.totalInvoiced)}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
          <span className="text-[10px] text-amber-800 font-semibold block uppercase">Uncollected Balance</span>
          <span className="font-bold text-amber-950 text-sm mt-0.5 block">{formatCurrency(data.totalOutstanding)}</span>
        </div>
      </div>
    </div>
  );
};

// 4. Overdue Invoice Summary by Aging Buckets
export const OverdueSummaryVisual: React.FC<{
  buckets: AgingBucketPoint[];
  totalOverdueAmount: number;
  totalOverdueCount: number;
}> = ({ buckets, totalOverdueAmount, totalOverdueCount }) => {
  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between bg-rose-50/60 p-3 rounded-xl border border-rose-200">
        <div>
          <span className="text-[10px] text-rose-700 uppercase font-bold block">Delinquent Overdue Receivables</span>
          <span className="text-xl font-bold text-rose-700 mt-0.5 block">{formatCurrency(totalOverdueAmount)}</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
          {totalOverdueCount} unpaid invoices
        </span>
      </div>

      <div className="space-y-2">
        <span className="font-semibold text-slate-700 block">Aging Delinquency Distribution</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {buckets.map((b, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-semibold text-slate-500 block">{b.label}</span>
              <span className="font-bold text-slate-900 text-xs mt-1 block">{formatCurrency(b.amount)}</span>
              <span className="text-[10px] text-slate-400 block font-medium">{b.count} invoices</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
