import { useState } from 'react';
import type { InstallmentRow } from '../utils/calculations';
import { formatPLN, formatPercent, formatDate } from '../utils/formatters';

interface Props {
  schedule: InstallmentRow[];
}

export default function AmortizationTable({ schedule }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'past' | 'future'>('all');

  const filtered = schedule.filter(row => {
    if (filter === 'past') return row.isPast;
    if (filter === 'future') return !row.isPast;
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 24);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-800">
          Harmonogram spłat
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Wszystkie ({schedule.length})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1 rounded-lg text-sm font-medium cursor-pointer ${
              filter === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Przeszłe ({schedule.filter(r => r.isPast).length})
          </button>
          <button
            onClick={() => setFilter('future')}
            className={`px-3 py-1 rounded-lg text-sm font-medium cursor-pointer ${
              filter === 'future'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Przyszłe ({schedule.filter(r => !r.isPast).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">Nr</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">Data</th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">Rata</th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">Kapitał</th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">Ods. WIBOR</th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">Ods. marża</th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">WIBOR</th>
              <th className="px-3 py-2 text-right text-gray-600 font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(row => (
              <tr
                key={row.number}
                className={`border-t ${
                  row.isPast
                    ? 'bg-white hover:bg-gray-50'
                    : 'bg-blue-50/30 hover:bg-blue-50'
                }`}
              >
                <td className="px-3 py-2 text-gray-500">{row.number}</td>
                <td className="px-3 py-2 text-gray-800">{formatDate(row.date)}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">
                  {formatPLN(row.installment)}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {formatPLN(row.principal)}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {formatPLN(row.interestWibor)}
                </td>
                <td className="px-3 py-2 text-right text-purple-600">
                  {formatPLN(row.interestMargin)}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {formatPercent(row.wiborRate)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">
                  {formatPLN(row.remainingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 24 && (
        <div className="p-4 border-t text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm cursor-pointer"
          >
            {showAll
              ? 'Pokaż mniej'
              : `Pokaż wszystkie ${filtered.length} rat`}
          </button>
        </div>
      )}
    </div>
  );
}
