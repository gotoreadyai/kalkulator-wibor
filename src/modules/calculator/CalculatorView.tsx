import { useCases, useResult, useWiborSource } from '../../core/CaseContext';
import { tabModules } from '../../modules';
import LoanForm from '../../core-ui/LoanForm';
import { WIBOR_LAST_ACTUAL } from '../../data/wiborRates';

function WiborSourceBadge() {
  const { wiborData, openSheetModule } = useCases();
  const wiborSource = useWiborSource();
  const first = wiborData[0]?.date.slice(0, 7);
  const last = wiborData[wiborData.length - 1]?.date.slice(0, 7);
  const range = first && last ? `${first} \u2192 ${last}` : '';
  const isDefault = wiborSource !== 'custom';

  return (
    <button onClick={() => openSheetModule('wiborData')}
      className={`mt-3 w-full text-left cursor-pointer alert text-xs ${isDefault ? 'alert-warning' : 'alert-success'}`}>
      <div>
        <div>Dane WIBOR: {isDefault ? 'wbudowane (przybliżone)' : 'zaimportowane'} · {wiborData.length} wpisów · {range}</div>
        {isDefault && (
          <div className="mt-1">Zawiera prognozy od {WIBOR_LAST_ACTUAL.replace('-', '/')}. <span className="underline font-medium">Zaimportuj dokładne dane</span></div>
        )}
      </div>
    </button>
  );
}

export default function CalculatorView() {
  const { activeTab, setActiveTab, activeCaseId } = useCases();
  const result = useResult();

  const activeTabModule = tabModules.find(m => m.id === activeTab) ?? tabModules[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-6">
          <LoanForm key={activeCaseId} />
          <WiborSourceBadge />
        </div>
      </div>

      <div className="lg:col-span-8">
        {result ? (
          <div className="space-y-6">
            <div role="tablist" className="tabs tabs-boxed">
              {tabModules.map(m => (
                <button key={m.id} role="tab" onClick={() => setActiveTab(m.id)}
                  className={`tab ${activeTabModule.id === m.id ? 'tab-active' : ''}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <activeTabModule.Component />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Hero — dominant element, golden ratio spacing */}
            <div className="pt-8 pb-10 px-2">
              <h2 className="display-tight leading-[1.1]">
                Oblicz ile przepłacasz<br />na kredycie z&nbsp;WIBOR
              </h2>
              <div className="mt-6 flex flex-col gap-2.5 text-[0.9375rem] opacity-70 leading-relaxed">
                <p>Porównaj ratę z WIBOR i bez WIBOR</p>
                <p>Oblicz kwotę roszczenia do pozwu</p>
                <p>Zobacz ile nadpłaciłeś od początku kredytu</p>
              </div>
              <p className="label-caps mt-10">Wypełnij formularz aby zobaczyć wynik</p>
            </div>

            {/* Divider — thin, Swiss-style */}
            <div className="border-t border-base-300 mx-2" />

            {/* TSUE — secondary block, restrained */}
            <div className="py-8 px-2">
              <p className="label-caps mb-3">Wyrok TSUE</p>
              <h3 className="leading-snug">
                C-471/24 z&nbsp;12.02.2026 — klauzule WIBOR&nbsp;+&nbsp;marża mogą być nieuczciwe
              </h3>
              <p className="mt-3 text-[0.8125rem] opacity-55 leading-relaxed max-w-lg">
                Banki miały obowiązek przedstawić symulację skrajnego wzrostu stóp. Większość tego nie zrobiła — to otwiera drogę do pozwu.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-base-300 mx-2" />

            {/* Benefits — compact grid, Fibonacci scale */}
            <div className="py-8 px-2">
              <p className="label-caps mb-5">Co możesz zyskać</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <p className="text-2xl font-bold tabular-nums tracking-tight">30–50%</p>
                  <p className="text-[0.8125rem] opacity-50 mt-1">niższa rata kredytu</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">Zwrot</p>
                  <p className="text-[0.8125rem] opacity-50 mt-1">nadpłaconych odsetek</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">Niższe</p>
                  <p className="text-[0.8125rem] opacity-50 mt-1">saldo zadłużenia</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">Stała rata</p>
                  <p className="text-[0.8125rem] opacity-50 mt-1">przewidywalne koszty</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
