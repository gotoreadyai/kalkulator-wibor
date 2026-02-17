import type { CalculationResult } from '../utils/calculations';
import { formatPLN, formatPercent } from '../utils/formatters';

interface Props {
  result: CalculationResult;
}

function Card({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  const valueColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    purple: 'text-purple-700',
    gray: 'text-gray-700',
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColors[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function ResultsSummary({ result }: Props) {
  return (
    <div className="space-y-6">
      {/* Sekcja: Dotychczasowe spłaty */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          Dotychczasowe spłaty ({result.pastInstallmentsCount} rat)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            title="Wpłacono łącznie"
            value={formatPLN(result.pastTotalPaid)}
            subtitle="Kapitał + odsetki"
            color="blue"
          />
          <Card
            title="Spłacony kapitał"
            value={formatPLN(result.pastPrincipalPaid)}
            color="gray"
          />
          <Card
            title="Zapłacone odsetki"
            value={formatPLN(result.pastInterestTotal)}
            subtitle={`WIBOR: ${formatPLN(result.pastInterestWibor)} | Marża: ${formatPLN(result.pastInterestMargin)}${result.pastInterestBridge > 0 ? ` | Pomostowa: ${formatPLN(result.pastInterestBridge)}` : ''}`}
            color="amber"
          />
        </div>
      </div>

      {/* Sekcja: Rozbicie odsetek */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          Rozbicie zapłaconych odsetek
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            title="Odsetki z WIBOR"
            value={formatPLN(result.pastInterestWibor)}
            subtitle={`${formatPercent(result.pastInterestTotal > 0 ? (result.pastInterestWibor / result.pastInterestTotal) * 100 : 0, 1)} całości odsetek`}
            color="red"
          />
          <Card
            title="Odsetki z marży"
            value={formatPLN(result.pastInterestMargin)}
            subtitle={`${formatPercent(result.pastInterestTotal > 0 ? (result.pastInterestMargin / result.pastInterestTotal) * 100 : 0, 1)} całości odsetek`}
            color="purple"
          />
          {result.pastInterestBridge > 0 && (
            <Card
              title="Odsetki z marży pomostowej"
              value={formatPLN(result.pastInterestBridge)}
              color="gray"
            />
          )}
        </div>
      </div>

      {/* Sekcja: Przyszłe raty */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          Przyszłe spłaty ({result.futureInstallmentsCount} rat)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            title="Do spłaty łącznie"
            value={formatPLN(result.futureTotalToPay)}
            subtitle="Przy obecnym WIBOR"
            color="blue"
          />
          <Card
            title="Obecna rata"
            value={formatPLN(result.currentInstallment)}
            subtitle="Z WIBOR + marża"
            color="amber"
          />
          <Card
            title="Przyszłe odsetki"
            value={formatPLN(result.futureInterestTotal)}
            subtitle={`WIBOR: ${formatPLN(result.futureInterestWibor)} | Marża: ${formatPLN(result.futureInterestMargin)}`}
            color="gray"
          />
        </div>
      </div>

      {/* Sekcja: Kwoty do odzyskania */}
      <div className="bg-green-50 rounded-xl border-2 border-green-300 p-5">
        <h3 className="text-lg font-bold text-green-800 mb-3">
          Potencjalne roszczenia (eliminacja WIBOR)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            title="Nadpłacone odsetki"
            value={formatPLN(result.overpaidInterest)}
            subtitle="Kwota zwrotu od banku"
            color="green"
          />
          <Card
            title="Oszczędność na przyszłości"
            value={formatPLN(result.futureSavings)}
            subtitle="Niższe raty do końca umowy"
            color="green"
          />
          <Card
            title="Łączna korzyść"
            value={formatPLN(result.overpaidInterest + result.futureSavings)}
            subtitle="Nadpłata + oszczędność"
            color="green"
          />
          <Card
            title="Rata bez WIBOR"
            value={formatPLN(result.installmentNoWibor)}
            subtitle={`Oszczędność: ${formatPLN(result.currentInstallment - result.installmentNoWibor)}/mies.`}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}
