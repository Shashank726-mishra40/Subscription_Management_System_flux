import React from 'react';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Customer } from '../../types';
import { formatCurrency, getInitials } from '../../utils/formatters';
import { Users, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecentCustomersCardProps {
  customers: Customer[];
}

export const RecentCustomersCard: React.FC<RecentCustomersCardProps> = ({ customers }) => {
  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>Recent Customers</span>
            </div>
          }
          subtitle="New accounts onboarded this month"
          action={
            <Link
              to="/customers"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Directory
            </Link>
          }
        />
        <CardContent className="p-0 divide-y divide-slate-100">
          {customers.map((cust) => (
            <div
              key={cust.id}
              className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                  {getInitials(cust.companyName)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {cust.companyName}
                    </p>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                      {cust.customerType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {cust.name} · {cust.email}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-slate-900">
                  {formatCurrency(cust.totalSpent)}
                </span>
                <p className="text-[10px] text-slate-400">
                  {cust.activeSubscriptionsCount} active sub{cust.activeSubscriptionsCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </div>

      <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-center">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <span>Explore customer accounts database</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
};
