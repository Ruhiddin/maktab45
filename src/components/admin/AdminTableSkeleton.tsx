import React from 'react';

interface Props {
  columns: number;
  rows?: number;
}

export default function AdminTableSkeleton({ columns, rows = 6 }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-6 py-4">
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((__, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div
                      className="h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse"
                      style={{ width: `${Math.max(30, 88 - colIndex * 10)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
