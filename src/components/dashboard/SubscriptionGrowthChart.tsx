import React, { useState } from 'react';
import { GrowthDataPoint } from '../../types';

interface SubscriptionGrowthChartProps {
  data: GrowthDataPoint[];
}

export const SubscriptionGrowthChart: React.FC<SubscriptionGrowthChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.active)) * 1.1;
  const minVal = Math.min(...data.map((d) => d.active)) * 0.85;
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
    return paddingY + innerHeight - ((value - minVal) / (maxVal - minVal)) * innerHeight;
  };

  const activePoints = data.map((d, i) => `${getX(i)},${getY(d.active)}`).join(' ');
  const areaPoints = `${getX(0)},${paddingY + innerHeight} ${activePoints} ${getX(data.length - 1)},${paddingY + innerHeight}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-600 font-medium">Active Subscriptions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 inline-block"></span>
            <span className="text-slate-600 font-medium">Net Growth (+12.1% MoM)</span>
          </div>
        </div>

        {hoveredIdx !== null && (
          <div className="text-xs bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-md font-semibold animate-in fade-in">
            {data[hoveredIdx].month}: {data[hoveredIdx].active.toLocaleString()} Active (+{data[hoveredIdx].netNew} net new)
          </div>
        )}
      </div>

      <div className="relative w-full aspect-[2.4/1] max-h-[250px]">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = paddingY + innerHeight * ratio;
            const valueAtGrid = maxVal - ratio * (maxVal - minVal);
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
                  {Math.round(valueAtGrid)}
                </text>
              </g>
            );
          })}

          {/* Area */}
          <polygon points={areaPoints} fill="url(#growthGradient)" />

          {/* Growth Trend Line */}
          <polyline
            points={activePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.active);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
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
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  className="fill-white stroke-emerald-500 transition-all duration-150"
                  strokeWidth="2.5"
                />

                <text
                  x={cx}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered ? 'fill-emerald-600 font-bold' : 'fill-slate-500'
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
