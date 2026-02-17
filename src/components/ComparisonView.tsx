import type { CalculationResult } from '../utils/calculations';
import { formatPLN } from '../utils/formatters';

interface Props {
  result: CalculationResult;
}

function Row({
  label,
  withWibor,
  withoutWibor,
  highlight,
}: {
  label: string;
  withWibor: number;
  withoutWibor: number;
  highlight?: boolean;
}) {
  const diff = withWibor - withoutWibor;
  return (
    <tr className={highlight ? 'bg-green-50 font-bold' : 'hover:bg-gray-50'}>
      <td className="px-4 py-3 text-gray-700">{label}</td>
      <td className="px-4 py-3 text-right text-gray-800">{formatPLN(withWibor)}</td>
      <td className="px-4 py-3 text-right text-gray-800">{formatPLN(withoutWibor)}</td>
      <td className={`px-4 py-3 text-right font-medium ${diff > 0 ? 'text-green-600' : 'text-gray-500'}`}>
        {diff > 0.01 ? `+${formatPLN(diff)}` : '-'}
      </td>
    </tr>
  );
}

export default function ComparisonView({ result }: Props) {
  const totalWithWibor = result.pastTotalPaid + result.futureTotalToPay;
  const totalWithoutWibor = result.pastTotalPaidNoWibor + result.futureTotalNoWibor;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold text-gray-800">
          Porównanie: z WIBOR vs bez WIBOR
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Scenariusz eliminacji wskaźnika WIBOR - kredyt oprocentowany wyłącznie marżą banku
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Pozycja</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Z WIBOR</th>
              <th className="px-4 py-3 text-right text-gray-600 font-medium">Bez WIBOR</th>
              <th className="px-4 py-3 text-right text-green-600 font-medium">Korzyść</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="bg-gray-50/50">
              <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Dotychczasowe spłaty
              </td>
            </tr>
            <Row
              label="Wpłacono łącznie"
              withWibor={result.pastTotalPaid}
              withoutWibor={result.pastTotalPaidNoWibor}
            />
            <Row
              label="Zapłacony kapitał"
              withWibor={result.pastPrincipalPaid}
              withoutWibor={result.pastPrincipalNoWibor}
            />
            <Row
              label="Zapłacone odsetki"
              withWibor={result.pastInterestTotal}
              withoutWibor={result.pastInterestNoWibor}
            />
            <tr className="bg-gray-50/50">
              <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Przyszłe spłaty
              </td>
            </tr>
            <Row
              label="Do spłaty łącznie"
              withWibor={result.futureTotalToPay}
              withoutWibor={result.futureTotalNoWibor}
            />
            <Row
              label="Przyszłe odsetki"
              withWibor={result.futureInterestTotal}
              withoutWibor={result.futureInterestNoWibor}
            />
            <Row
              label="Obecna rata miesięczna"
              withWibor={result.currentInstallment}
              withoutWibor={result.installmentNoWibor}
            />
            <tr className="bg-gray-50/50">
              <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Podsumowanie
              </td>
            </tr>
            <Row
              label="Całkowity koszt kredytu (kapitał + odsetki)"
              withWibor={totalWithWibor}
              withoutWibor={totalWithoutWibor}
              highlight
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
