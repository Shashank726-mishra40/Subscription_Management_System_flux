import React from 'react';
import { PaymentStatusDataPoint } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PaymentStatusChartProps {
  data: PaymentStatusDataPoint[];
}

export const PaymentStatusChart: React.FC<PaymentStatusChartProps> = ({ data }) => {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="w-full">
      {/* Segmented Progress Bar */}
      <div className="mb-6">
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-1">
          {data.map((item, idx) => (
            <div
              key={idx}
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
              }}
              className="h-full rounded-full transition-all duration-500 hover:opacity-90"
              title={`${item.status}: ${item.percentage}%`}
            />
          ))}
        </div>
      </div>

      {/* Breakdown list */}
      <div className="space-y-3.5">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">{item.status}</p>
                <p className="text-[11px] text-slate-400">
                  {item.count} transactions · {item.percentage}%
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">
                {formatCurrency(item.amount)}
              </p>
              <p className="text-[10px] text-slate-400">
                of {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
