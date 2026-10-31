import React, { useState } from 'react';
import { RevenueDataPoint } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.total)) * 1.15;
  const chartHeight = 220;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 20;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const getX = (index: number) => {
    return paddingX + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (value: number) => {
    return paddingY + innerHeight - (value / maxVal) * innerHeight;
  };

  // Generate SVG path for total revenue line & area fill
  const totalPoints = data.map((d, i) => `${getX(i)},${getY(d.total)}`).join(' ');
  const areaPoints = `${getX(0)},${paddingY + innerHeight} ${totalPoints} ${getX(data.length - 1)},${paddingY + innerHeight}`;

  // Recurring points
  const recurringPoints = data.map((d, i) => `${getX(i)},${getY(d.recurring)}`).join(' ');

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
            <span className="text-slate-600 font-medium">Total Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-400 inline-block"></span>
            <span className="text-slate-600 font-medium">Recurring (MRR)</span>
          </div>
        </div>

        {hoveredIdx !== null && (
          <div className="text-xs bg-indigo-50 text-indigo-900 px-2.5 py-1 rounded-md font-semibold animate-in fade-in">
            {data[hoveredIdx].month}: Total {formatCurrency(data[hoveredIdx].total)} (MRR {formatCurrency(data[hoveredIdx].recurring)})
          </div>
        )}
      </div>

      <div className="relative w-full aspect-[2.4/1] max-h-[250px]">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + innerHeight * ratio;
            const valueAtGrid = maxVal * (1 - ratio);
            return (
              <g key={idx}>
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
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-medium"
                >
                  ${Math.round(valueAtGrid / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Area under Total Revenue */}
          <polygon points={areaPoints} fill="url(#revenueGradient)" />

          {/* Line for Recurring MRR */}
          <polyline
            points={recurringPoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 5"
          />

          {/* Line for Total Revenue */}
          <polyline
            points={totalPoints}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.total);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Invisible hover hotspot */}
                <rect
                  x={cx - 20}
                  y={paddingY}
                  width="40"
                  height={innerHeight}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingY}
                    x2={cx}
                    y2={paddingY + innerHeight}
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  className="fill-white stroke-indigo-600 transition-all duration-150"
                  strokeWidth="2.5"
                />

                {/* X Axis Labels */}
                <text
                  x={cx}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered ? 'fill-indigo-600 font-bold' : 'fill-slate-500'
                  }`}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
