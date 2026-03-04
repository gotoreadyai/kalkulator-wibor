import { useEffect, useState } from 'react';
import { Settings, Sun, Moon } from 'lucide-react';
import { useCases } from './core/CaseContext';
import { appModules } from './modules';
import SettingsPage from './core-ui/SettingsPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function SheetModuleRenderer() {
  const openSheet = useCases(s => s.openSheet);
  const closeSheet = useCases(s => s.closeSheet);
  const enabledAppModules = useCases(s => s.enabledAppModules);
  const mod = appModules.find(m => m.id === openSheet && m.type === 'sheet' && !m.comingSoon && (m.alwaysEnabled || enabledAppModules.includes(m.id)));
  if (!mod) return null;
  return (
    <div className="drawer drawer-end open">
      <input type="checkbox" className="drawer-toggle" checked readOnly />
      <div className="drawer-side z-50">
        <label className="drawer-overlay" onClick={closeSheet}></label>
        <div className="bg-base-100 min-h-full w-[520px] max-w-[90vw] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
            <h2 className="text-lg font-bold">{mod.label}</h2>
            <button onClick={closeSheet} className="btn btn-ghost btn-sm btn-circle">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ErrorBoundary><mod.Component /></ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const activeTab = useCases(s => s.activeTab);
  const ready = useCases(s => s.ready);
  if (!ready) return null;
  if (activeTab === 'settings') return <SettingsPage />;
  const pageModule = appModules.find(m => m.type === 'page' && m.id === 'calculator');
  return pageModule ? <pageModule.Component /> : null;
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <label className="swap swap-rotate btn btn-ghost btn-sm btn-circle">
      <input type="checkbox" checked={dark} onChange={() => setDark(!dark)} />
      <Sun className="swap-off w-5 h-5" />
      <Moon className="swap-on w-5 h-5" />
    </label>
  );
}

function HeaderIconBar() {
  const activeTab = useCases(s => s.activeTab);
  const setActiveTab = useCases(s => s.setActiveTab);
  const enabledAppModules = useCases(s => s.enabledAppModules);
  const openSheet = useCases(s => s.openSheet);
  const openSheetModule = useCases(s => s.openSheetModule);
  const closeSheet = useCases(s => s.closeSheet);

  const visibleModules = appModules.filter(m => !m.comingSoon && (enabledAppModules.includes(m.id) || m.alwaysEnabled) && m.showInHeader !== false);
  const isOnCalculator = activeTab !== 'settings';

  return (
    <div className="flex items-center gap-1">
      {visibleModules.map(mod => {
        const Icon = mod.icon;
        const isActive = mod.type === 'page' ? isOnCalculator && mod.id === 'calculator' : openSheet === mod.id;
        const handleClick = () => {
          if (mod.type === 'page') setActiveTab('summary');
          else openSheet === mod.id ? closeSheet() : openSheetModule(mod.id);
        };
        return (
          <button key={mod.id} onClick={handleClick} title={mod.label}
            className={`btn btn-ghost btn-sm btn-circle ${isActive ? '' : 'opacity-40'}`}>
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
      <button onClick={() => setActiveTab('settings')} title="Ustawienia"
        className={`btn btn-ghost btn-sm btn-circle ${activeTab === 'settings' ? '' : 'opacity-40'}`}>
        <Settings className="w-5 h-5" />
      </button>
      <div className="divider divider-horizontal mx-0"></div>
      <ThemeToggle />
    </div>
  );
}

export default function App() {
  const init = useCases(s => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <header className="bg-neutral text-neutral-content">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-bold tracking-tight">Kalkulator WIBOR</h1>
            <span className="hidden sm:inline label-caps">Roszczenie do pozwu</span>
          </div>
          <HeaderIconBar />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <ErrorBoundary><AppShell /></ErrorBoundary>
      </main>

      <footer className="bg-neutral text-neutral-content mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
            <div>
              <p className="label-caps mb-2">Kalkulator WIBOR</p>
              <p className="text-[0.8125rem] opacity-55 max-w-md leading-relaxed">
                Narzędzie do szacowania roszczeń z tytułu odwiborowania kredytu hipotecznego. Wyniki mają charakter poglądowy i nie stanowią porady prawnej.
              </p>
            </div>
            <div className="text-xs opacity-30 sm:text-right shrink-0">
              <p>kalkulator-wibor-pozew.pl</p>
              <p className="mt-1">Obliczenia wykonywane lokalnie w przeglądarce</p>
            </div>
          </div>
          <div className="border-t border-neutral-content/10 mt-6 pt-4">
            <p className="text-xs opacity-20">Wyniki mogą się różnić od rzeczywistych kwot ze względu na zaokrąglenia, daty fixingów WIBOR i indywidualne warunki umowy.</p>
          </div>
        </div>
      </footer>

      <SheetModuleRenderer />
    </div>
  );
}
