import { useState } from 'react';
import { formatPercent } from '../utils/formatters';

interface WiborEntry {
  date: string;
  rate: number;
}

interface ValidationResult {
  isValid: boolean;
  totalEntries: number;
  dateRange: string;
  gaps: string[];
  warnings: string[];
  errors: string[];
}

interface Props {
  wiborData: WiborEntry[];
  onDataUpdate: (data: WiborEntry[]) => void;
}

const STOOQ_URL = 'https://stooq.pl/q/d/l/?s=plopln3m&d1=20050101&d2=20261231&i=m';

/**
 * Parsuje CSV ze stooq.pl
 * Format: Data,Otwarcie,Najwyzszy,Najnizszy,Zamkniecie
 */
function parseStooqCsv(csv: string): WiborEntry[] {
  const lines = csv.trim().split('\n');
  const entries: WiborEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 5) continue;

    const date = parts[0].trim();
    const closeRate = parseFloat(parts[4].trim());

    if (date && !isNaN(closeRate)) {
      entries.push({ date, rate: closeRate });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parsuje JSON z eksportu kalkulatora
 */
function parseJson(json: string): WiborEntry[] {
  const data = JSON.parse(json);
  if (Array.isArray(data)) {
    return data
      .filter((e: any) => e.date && typeof e.rate === 'number')
      .sort((a: WiborEntry, b: WiborEntry) => a.date.localeCompare(b.date));
  }
  // Format klucz-wartość: { "2015-01": 1.65, ... }
  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([key, value]) => ({
        date: key.length === 7 ? `${key}-01` : key,
        rate: value as number,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return [];
}

/**
 * Waliduje dane WIBOR
 */
function validateData(entries: WiborEntry[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const gaps: string[] = [];

  if (entries.length === 0) {
    return {
      isValid: false,
      totalEntries: 0,
      dateRange: '-',
      gaps: [],
      warnings: [],
      errors: ['Brak danych'],
    };
  }

  // Sprawdź zakres dat
  const firstDate = entries[0].date;
  const lastDate = entries[entries.length - 1].date;

  // Sprawdź wartości
  for (const entry of entries) {
    if (entry.rate < 0) {
      errors.push(`Ujemna stawka: ${entry.date} = ${entry.rate}%`);
    }
    if (entry.rate > 15) {
      warnings.push(`Bardzo wysoka stawka: ${entry.date} = ${entry.rate}%`);
    }
  }

  // Sprawdź luki miesięczne
  for (let i = 1; i < entries.length; i++) {
    const prev = new Date(entries[i - 1].date);
    const curr = new Date(entries[i].date);
    const diffMonths =
      (curr.getFullYear() - prev.getFullYear()) * 12 +
      (curr.getMonth() - prev.getMonth());

    if (diffMonths > 2) {
      gaps.push(
        `Luka: ${entries[i - 1].date} → ${entries[i].date} (${diffMonths} mies.)`
      );
    }
  }

  if (gaps.length > 0) {
    warnings.push(`Znaleziono ${gaps.length} luk w danych`);
  }

  const today = new Date();
  const lastEntryDate = new Date(lastDate);
  const monthsDiff =
    (today.getFullYear() - lastEntryDate.getFullYear()) * 12 +
    (today.getMonth() - lastEntryDate.getMonth());

  if (monthsDiff > 2) {
    warnings.push(
      `Dane mogą być nieaktualne - ostatni wpis: ${lastDate}`
    );
  }

  return {
    isValid: errors.length === 0,
    totalEntries: entries.length,
    dateRange: `${firstDate} → ${lastDate}`,
    gaps,
    warnings,
    errors,
  };
}

export default function WiborDataManager({ wiborData, onDataUpdate }: Props) {
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [fetchError, setFetchError] = useState('');
  const [previewData, setPreviewData] = useState<WiborEntry[] | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importError, setImportError] = useState('');

  // Walidacja aktualnych danych
  const currentValidation = validateData(wiborData);

  // --- FETCH Z API ---
  const handleFetch = async () => {
    setFetchStatus('loading');
    setFetchError('');
    setPreviewData(null);

    try {
      const response = await fetch(STOOQ_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const csv = await response.text();
      const entries = parseStooqCsv(csv);

      if (entries.length === 0) {
        throw new Error('Nie udało się sparsować danych CSV');
      }

      const validationResult = validateData(entries);
      setPreviewData(entries);
      setValidation(validationResult);
      setFetchStatus('success');
    } catch (err: any) {
      setFetchStatus('error');
      setFetchError(
        err.message.includes('fetch')
          ? 'Błąd CORS - stooq.pl blokuje zapytania z przeglądarki. Pobierz plik ręcznie i użyj importu.'
          : err.message
      );
    }
  };

  // --- IMPORT PLIKU ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let entries: WiborEntry[];

        if (file.name.endsWith('.json')) {
          entries = parseJson(text);
        } else {
          // CSV
          entries = parseStooqCsv(text);
        }

        if (entries.length === 0) {
          setImportError('Nie udało się odczytać danych z pliku. Sprawdź format.');
          return;
        }

        const validationResult = validateData(entries);
        setPreviewData(entries);
        setValidation(validationResult);
        setFetchStatus('success');
      } catch (err: any) {
        setImportError(`Błąd parsowania: ${err.message}`);
      }
    };

    reader.readAsText(file);
    // Reset inputu żeby można było wgrać ten sam plik ponownie
    e.target.value = '';
  };

  // --- ZASTOSUJ DANE ---
  const handleApply = () => {
    if (previewData) {
      onDataUpdate(previewData);
      setPreviewData(null);
      setValidation(null);
      setFetchStatus('idle');
    }
  };

  // --- EKSPORT JSON ---
  const handleExport = () => {
    const json = JSON.stringify(wiborData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wibor3m_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- EKSPORT CSV ---
  const handleExportCsv = () => {
    const header = 'Data,Otwarcie,Najwyzszy,Najnizszy,Zamkniecie\n';
    const rows = wiborData
      .map(e => `${e.date},${e.rate},${e.rate},${e.rate},${e.rate}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wibor3m_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Status aktualnych danych */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Aktualne dane WIBOR 3M
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Wpisów</p>
            <p className="text-lg font-bold text-gray-800">{currentValidation.totalEntries}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Zakres</p>
            <p className="text-sm font-medium text-gray-800">{currentValidation.dateRange}</p>
          </div>
          <div className={`rounded-lg p-3 ${currentValidation.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-500">Status</p>
            <p className={`text-sm font-bold ${currentValidation.isValid ? 'text-green-700' : 'text-red-700'}`}>
              {currentValidation.isValid ? 'OK' : 'Błędy'}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${currentValidation.warnings.length > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-500">Ostrzeżenia</p>
            <p className="text-sm font-bold text-gray-800">{currentValidation.warnings.length}</p>
          </div>
        </div>

        {currentValidation.warnings.length > 0 && (
          <div className="mb-4">
            {currentValidation.warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-1 mb-1">{w}</p>
            ))}
          </div>
        )}

        {currentValidation.gaps.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-1">Luki w danych:</p>
            {currentValidation.gaps.map((g, i) => (
              <p key={i} className="text-xs text-gray-500 pl-3">{g}</p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium cursor-pointer"
          >
            Eksport JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium cursor-pointer"
          >
            Eksport CSV
          </button>
        </div>
      </div>

      {/* Pobierz z API */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          Pobierz z API (stooq.pl)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Pobiera historyczne stawki WIBOR 3M miesięcznie z serwisu stooq.pl (dane zamknięcia miesiąca).
        </p>

        <div className="flex gap-3 items-center mb-4">
          <button
            onClick={handleFetch}
            disabled={fetchStatus === 'loading'}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium cursor-pointer disabled:cursor-not-allowed"
          >
            {fetchStatus === 'loading' ? 'Pobieranie...' : 'Pobierz dane'}
          </button>

          <a
            href={STOOQ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Pobierz CSV ręcznie
          </a>
        </div>

        {fetchStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{fetchError}</p>
            <p className="text-xs text-red-500 mt-1">
              Alternatywnie: kliknij "Pobierz CSV ręcznie", zapisz plik, i użyj importu poniżej.
            </p>
          </div>
        )}
      </div>

      {/* Import pliku */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          Import danych
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Wgraj plik CSV (format stooq.pl) lub JSON (eksport kalkulatora).
        </p>

        <div className="flex items-center gap-3">
          <label className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium cursor-pointer inline-block">
            Wybierz plik (.csv / .json)
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        {importError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}
      </div>

      {/* Podgląd pobranych/zaimportowanych danych */}
      {previewData && validation && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Podgląd danych
            </h3>
            <button
              onClick={handleApply}
              disabled={!validation.isValid}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-bold cursor-pointer disabled:cursor-not-allowed"
            >
              Zastosuj dane ({previewData.length} wpisów)
            </button>
          </div>

          {/* Walidacja */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Wpisów</p>
              <p className="text-lg font-bold text-gray-800">{validation.totalEntries}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Zakres</p>
              <p className="text-sm font-medium text-gray-800">{validation.dateRange}</p>
            </div>
            <div className={`rounded-lg p-3 ${validation.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">Status</p>
              <p className={`text-sm font-bold ${validation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                {validation.isValid ? 'OK - można zastosować' : 'Błędy!'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Luki</p>
              <p className="text-sm font-bold text-gray-800">{validation.gaps.length}</p>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="mb-3">
              {validation.errors.map((e, i) => (
                <p key={i} className="text-sm text-red-700 bg-red-50 rounded px-3 py-1 mb-1">{e}</p>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mb-3">
              {validation.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-1 mb-1">{w}</p>
              ))}
            </div>
          )}

          {/* Tabela podglądu */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Data</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-medium">WIBOR 3M</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-medium">Zmiana</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((entry, i) => {
                  const prev = i > 0 ? previewData[i - 1].rate : entry.rate;
                  const diff = entry.rate - prev;
                  return (
                    <tr key={entry.date} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-800">{entry.date}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                        {formatPercent(entry.rate)}
                      </td>
                      <td className={`px-3 py-1.5 text-right text-xs ${
                        diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400'
                      }`}>
                        {diff !== 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(2)} pp` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
