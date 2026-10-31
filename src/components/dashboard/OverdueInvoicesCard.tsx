import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../common/Card';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AlertTriangle, Mail, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  contactEmail: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  lastReminderSent: string;
}

interface OverdueInvoicesCardProps {
  invoices: OverdueInvoiceItem[];
}

export const OverdueInvoicesCard: React.FC<OverdueInvoicesCardProps> = ({ invoices }) => {
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});

  const handleSendReminder = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setRemindedIds((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      // keep it checked
    }, 2000);
  };

  return (
    <Card className="h-full flex flex-col justify-between border-rose-200/70">
      <div>
        <CardHeader
          className="bg-rose-50/40"
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-rose-950 font-semibold">Overdue Invoices</span>
            </div>
          }
          subtitle="Immediate follow-up required"
          action={
            <Link
              to="/invoices"
              className="text-xs font-semibold text-rose-700 hover:text-rose-900"
            >
              All Invoices
            </Link>
          }
        />
        <CardContent className="p-0 divide-y divide-slate-100">
          {invoices.map((item) => {
            const isReminded = remindedIds[item.id];
            return (
              <div
                key={item.id}
                className="p-4 hover:bg-rose-50/20 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {item.customerName}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                      {item.daysOverdue}d overdue
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.invoiceNumber} · Due {formatDate(item.dueDate)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-700">
                      {formatCurrency(item.amount)}
                    </span>
                    <p className="text-[10px] text-slate-400">Unpaid</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleSendReminder(item.id, e)}
                    disabled={isReminded}
                    title="Send Email Reminder"
                    className={`p-1.5 rounded-lg border text-xs transition-all ${
                      isReminded
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300 hover:text-indigo-600'
                    }`}
                  >
                    {isReminded ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </div>

      <div className="p-3 bg-rose-50/30 border-t border-rose-100/60 text-center">
        <Link
          to="/invoices"
          className="text-xs font-medium text-rose-700 hover:text-rose-900 transition-colors"
        >
          View total overdue balance: {formatCurrency(11800)}
        </Link>
      </div>
    </Card>
  );
};
