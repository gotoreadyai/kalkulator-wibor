import type { CalculationResult } from '../utils/calculations';
import { formatPLN, formatPercent } from '../utils/formatters';

interface Props {
  result: CalculationResult;
}

function BarSegment({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 15 && (
            <span className="text-xs text-white font-medium">
              {formatPercent(pct, 1)}
            </span>
          )}
        </div>
      </div>
      <div className="w-32 text-right text-sm font-medium text-gray-800 shrink-0">
        {formatPLN(value)}
      </div>
    </div>
  );
}

export default function InterestBreakdown({ result }: Props) {
  const totalInterest =
    result.pastInterestTotal + result.futureInterestTotal;
  const totalWibor =
    result.pastInterestWibor + result.futureInterestWibor;
  const totalMargin =
    result.pastInterestMargin + result.futureInterestMargin;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          Struktura odsetek
        </h3>
        <p className="text-sm text-gray-500">
          Rozbicie odsetek na część wynikającą z WIBOR i z marży banku
        </p>
      </div>

      {/* Dotychczasowe odsetki */}
      <div>
        <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
          Odsetki zapłacone (do dziś)
        </h4>
        <div className="space-y-2">
          <BarSegment
            label="WIBOR"
            value={result.pastInterestWibor}
            total={result.pastInterestTotal}
            color="bg-red-500"
          />
          <BarSegment
            label="Marża"
            value={result.pastInterestMargin}
            total={result.pastInterestTotal}
            color="bg-purple-500"
          />
          {result.pastInterestBridge > 0 && (
            <BarSegment
              label="Pomostowa"
              value={result.pastInterestBridge}
              total={result.pastInterestTotal}
              color="bg-gray-400"
            />
          )}
        </div>
        <div className="mt-2 text-right text-sm text-gray-500">
          Łącznie: {formatPLN(result.pastInterestTotal)}
        </div>
      </div>

      {/* Przyszłe odsetki */}
      {result.futureInterestTotal > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
            Odsetki przyszłe (prognoza)
          </h4>
          <div className="space-y-2">
            <BarSegment
              label="WIBOR"
              value={result.futureInterestWibor}
              total={result.futureInterestTotal}
              color="bg-red-300"
            />
            <BarSegment
              label="Marża"
              value={result.futureInterestMargin}
              total={result.futureInterestTotal}
              color="bg-purple-300"
            />
          </div>
          <div className="mt-2 text-right text-sm text-gray-500">
            Łącznie: {formatPLN(result.futureInterestTotal)}
          </div>
        </div>
      )}

      {/* Podsumowanie całkowite */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
          Łączne odsetki za cały okres kredytu
        </h4>
        <div className="space-y-2">
          <BarSegment
            label="WIBOR"
            value={totalWibor}
            total={totalInterest}
            color="bg-red-500"
          />
          <BarSegment
            label="Marża"
            value={totalMargin}
            total={totalInterest}
            color="bg-purple-500"
          />
        </div>
        <div className="mt-2 text-right text-sm font-medium text-gray-700">
          Łącznie: {formatPLN(totalInterest)}
        </div>
      </div>
    </div>
  );
}
