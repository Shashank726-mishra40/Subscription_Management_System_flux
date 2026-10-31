import React from 'react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyMessage?: string;
  emptySubtext?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  emptySubtext = 'Items will appear here once created.',
  className,
  onRowClick,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
        <p className="text-xs text-slate-400 mt-1">{emptySubtext}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className={cn('w-full text-left border-collapse text-sm', className)}>
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/75">
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={cn(
                  'py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, rowIdx) => (
            <tr
              key={keyExtractor(row, rowIdx)}
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                'group hover:bg-slate-50/80 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col, colIdx) => {
                const cellContent = col.cell
                  ? col.cell(row, rowIdx)
                  : col.accessorKey
                  ? String(row[col.accessorKey] ?? '')
                  : null;

                return (
                  <td
                    key={colIdx}
                    className={cn('py-3.5 px-4 text-slate-700 whitespace-nowrap', col.className)}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
