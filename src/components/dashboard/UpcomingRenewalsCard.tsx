import React from 'react';
import { Card, CardHeader, CardContent } from '../common/Card';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RenewalItem {
  id: string;
  subscriptionNumber: string;
  customerName: string;
  contactPerson: string;
  planName: string;
  renewalDate: string;
  daysRemaining: number;
  mrr: number;
  billingCycle: string;
  autoRenew: boolean;
}

interface UpcomingRenewalsCardProps {
  renewals: RenewalItem[];
}

export const UpcomingRenewalsCard: React.FC<UpcomingRenewalsCardProps> = ({ renewals }) => {
  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-indigo-600" />
              <span>Upcoming Renewals</span>
            </div>
          }
          subtitle="Next 14 days renewal pipeline"
          action={
            <Link
              to="/subscriptions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Manage
            </Link>
          }
        />
        <CardContent className="p-0 divide-y divide-slate-100">
          {renewals.map((item) => (
            <div
              key={item.id}
              className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900 truncate">
                    {item.customerName}
                  </span>
                  {!item.autoRenew && (
                    <span
                      title="Manual renewal required"
                      className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium"
                    >
                      <AlertCircle className="w-2.5 h-2.5" />
                      Manual
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {item.planName} · Due {formatDate(item.renewalDate)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-slate-900">
                  {formatCurrency(item.mrr)}
                </span>
                <p className="text-[10px] font-semibold text-indigo-600">
                  in {item.daysRemaining} days
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </div>

      <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-center">
        <Link
          to="/subscriptions"
          className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          View all 24 upcoming renewals this month
        </Link>
      </div>
    </Card>
  );
};
