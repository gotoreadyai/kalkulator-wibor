import { useState } from 'react';
import LoanForm from './components/LoanForm';
import ResultsSummary from './components/ResultsSummary';
import AmortizationTable from './components/AmortizationTable';
import ComparisonView from './components/ComparisonView';
import InterestBreakdown from './components/InterestBreakdown';
import WiborDataManager from './components/WiborDataManager';
import { calculateLoan } from './utils/calculations';
import type { LoanInput, CalculationResult, WiborEntry } from './utils/calculations';
import { WIBOR_3M_RATES } from './data/wiborRates';

type TabId = 'summary' | 'schedule' | 'comparison' | 'breakdown' | 'wibor-data';

/** Konwersja domyślnych danych do formatu WiborEntry[] */
function getDefaultWiborEntries(): WiborEntry[] {
  return Object.entries(WIBOR_3M_RATES)
    .map(([key, rate]) => ({
      date: `${key}-01`,
      rate,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function App() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [wiborData, setWiborData] = useState<WiborEntry[]>(getDefaultWiborEntries);
  const [wiborSource, setWiborSource] = useState<'default' | 'custom'>('default');
  const [lastInput, setLastInput] = useState<LoanInput | null>(null);

  const handleCalculate = (input: LoanInput) => {
    const calcResult = calculateLoan({ ...input, wiborData });
    setResult(calcResult);
    setLastInput(input);
    setActiveTab('summary');
  };

  const handleWiborUpdate = (data: WiborEntry[]) => {
    setWiborData(data);
    setWiborSource('custom');

    // Przelicz automatycznie jeśli były wcześniejsze obliczenia
    if (lastInput) {
      const calcResult = calculateLoan({ ...lastInput, wiborData: data });
      setResult(calcResult);
    }
  };

  const resultTabs: { id: TabId; label: string }[] = [
    { id: 'summary', label: 'Podsumowanie' },
    { id: 'breakdown', label: 'Struktura odsetek' },
    { id: 'comparison', label: 'Porównanie' },
    { id: 'schedule', label: 'Harmonogram' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kalkulator WIBOR</h1>
            <p className="text-gray-400 text-sm mt-1">
              Sprawdź ile przepłacasz na kredycie z WIBOR i ile możesz odzyskać
            </p>
          </div>
          <button
            onClick={() => setActiveTab('wibor-data')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'wibor-data'
                ? 'bg-white text-gray-900'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Dane WIBOR
            {wiborSource === 'custom' && (
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-400" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'wibor-data' ? (
          /* Zakładka zarządzania danymi WIBOR */
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Dane WIBOR 3M</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Pobierz aktualne stawki z API, importuj plik CSV/JSON lub użyj danych domyślnych.
                  {wiborSource === 'custom'
                    ? ' Aktualnie: dane zaimportowane.'
                    : ' Aktualnie: dane wbudowane (przybliżone).'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab(result ? 'summary' : 'summary')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium cursor-pointer"
              >
                Wróć do kalkulatora
              </button>
            </div>
            <WiborDataManager wiborData={wiborData} onDataUpdate={handleWiborUpdate} />
          </div>
        ) : (
          /* Główny widok kalkulatora */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formularz - lewa kolumna */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-6">
                <LoanForm onCalculate={handleCalculate} />

                {/* Info o źródle danych WIBOR */}
                <div className={`mt-3 rounded-lg px-4 py-2.5 text-xs ${
                  wiborSource === 'custom'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {wiborSource === 'custom' ? (
                    <>Dane WIBOR: zaimportowane ({wiborData.length} wpisów)</>
                  ) : (
                    <>
                      Dane WIBOR: wbudowane (przybliżone).{' '}
                      <button
                        onClick={() => setActiveTab('wibor-data')}
                        className="underline font-medium cursor-pointer"
                      >
                        Zaimportuj dokładne dane
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Wyniki - prawa kolumna */}
            <div className="lg:col-span-8">
              {result ? (
                <div className="space-y-6">
                  {/* Zakładki */}
                  <div className="flex gap-1 bg-white rounded-xl shadow p-1">
                    {resultTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Treść zakładki */}
                  {activeTab === 'summary' && <ResultsSummary result={result} />}
                  {activeTab === 'breakdown' && <InterestBreakdown result={result} />}
                  {activeTab === 'comparison' && <ComparisonView result={result} />}
                  {activeTab === 'schedule' && <AmortizationTable schedule={result.schedule} />}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="text-6xl mb-4">&#x1F4CA;</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    Wprowadź dane kredytu
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Wypełnij formularz po lewej stronie danymi z umowy kredytowej, aby zobaczyć szczegółową analizę spłat i potencjalne roszczenia.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs">
          <p>
            Kalkulator ma charakter szacunkowy/poglądowy. Wyniki mogą się różnić od rzeczywistych kwot
            ze względu na zaokrąglenia, dokładne daty fixingów WIBOR i indywidualne warunki umowy.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
