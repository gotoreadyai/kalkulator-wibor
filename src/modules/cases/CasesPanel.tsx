import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useCases, useActiveCase, useLawsuitSummary, useResult, useTemplates, getBank } from '../../core/CaseContext';
import { formatPLN } from '../../utils/formatters';
import { EVIDENCE_ITEMS } from '../../core/types';
import type { PlaintiffData } from '../../core/types';

function LawsuitSection() {
  const activeCase = useActiveCase();
  const { updateLawsuit } = useCases();
  const summary = useLawsuitSummary();
  const result = useResult();

  if (!activeCase || !result) return null;

  const templates = useTemplates();
  const { lawsuit } = activeCase;
  const tpl = activeCase.templateId ? templates.find(t => t.id === activeCase.templateId) : null;
  const bank = tpl ? getBank(tpl.bankId) : null;

  const updatePlaintiff = (patch: Partial<PlaintiffData>) => {
    updateLawsuit({ plaintiff: { ...lawsuit.plaintiff, ...patch } });
  };

  const toggleEvidence = (key: string) => {
    updateLawsuit({
      evidenceChecklist: { ...lawsuit.evidenceChecklist, [key]: !lawsuit.evidenceChecklist[key] },
    });
  };

  return (
    <div className="space-y-4">
      <div className="divider text-xs opacity-50">Dane do pozwu</div>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Powód — imię i nazwisko</legend>
        <input type="text" value={lawsuit.plaintiff.name}
          onChange={e => updatePlaintiff({ name: e.target.value })}
          className="input input-bordered input-sm w-full" placeholder="Jan Kowalski" />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Powód — adres</legend>
        <input type="text" value={lawsuit.plaintiff.address}
          onChange={e => updatePlaintiff({ address: e.target.value })}
          className="input input-bordered input-sm w-full" placeholder="ul. Przykładowa 1, 00-001 Warszawa" />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Powód — PESEL</legend>
        <input type="text" value={lawsuit.plaintiff.pesel}
          onChange={e => updatePlaintiff({ pesel: e.target.value })}
          className="input input-bordered input-sm w-full" placeholder="12345678901" maxLength={11} />
      </fieldset>

      {bank && (
        <div className="bg-base-200 rounded-lg p-3 text-xs space-y-1">
          <p className="font-bold text-sm">Pozwany</p>
          <p>{bank.legalName}</p>
          <p><span className="opacity-50">KRS:</span> {bank.krs} <span className="opacity-50 ml-2">NIP:</span> {bank.nip}</p>
          <p><span className="opacity-50">Adres:</span> {bank.address}</p>
        </div>
      )}

      {!bank && (
        <div className="alert alert-warning text-xs">
          Wybierz szablon umowy w formularzu, aby uzupełnić dane pozwanego banku.
        </div>
      )}

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Sąd właściwy</legend>
        <input type="text" value={lawsuit.courtName}
          onChange={e => updateLawsuit({ courtName: e.target.value })}
          className="input input-bordered input-sm w-full"
          placeholder="Sąd Okręgowy w ..." />
        <p className="text-xs opacity-40 mt-1">Konsument może wybrać sąd wg swojego miejsca zamieszkania</p>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Data wezwania do zapłaty</legend>
        <input type="date" value={lawsuit.demandDate ?? ''}
          onChange={e => updateLawsuit({ demandDate: e.target.value || null })}
          className="input input-bordered input-sm w-full" />
      </fieldset>

      {summary && (
        <>
          <div className="divider text-xs opacity-50">Wyliczenia</div>

          <div className="stats stats-vertical shadow w-full text-sm">
            <div className="stat py-3 px-4">
              <div className="stat-title text-xs">Wartość przedmiotu sporu (WPS)</div>
              <div className="stat-value text-lg">{formatPLN(summary.wps)}</div>
              <div className="stat-desc">Nadpłacone odsetki z tytułu WIBOR</div>
            </div>
            <div className="stat py-3 px-4">
              <div className="stat-title text-xs">Opłata sądowa (5% WPS)</div>
              <div className="stat-value text-lg">{formatPLN(summary.courtFee)}</div>
            </div>
            {summary.statutoryDays > 0 && (
              <div className="stat py-3 px-4">
                <div className="stat-title text-xs">Odsetki ustawowe za opóźnienie</div>
                <div className="stat-value text-lg">{formatPLN(summary.statutoryInterest)}</div>
                <div className="stat-desc">{summary.statutoryDays} dni × {summary.statutoryRate}% rocznie</div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="divider text-xs opacity-50">Dowody — checklista</div>

      <div className="space-y-2">
        {Object.entries(EVIDENCE_ITEMS).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-sm"
              checked={!!lawsuit.evidenceChecklist[key]}
              onChange={() => toggleEvidence(key)} />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CasesPanel() {
  const { cases, activeCaseId, activeInput, loadCase, saveCurrentAsCase, newCase, deleteCase, renameCase, closeSheet } = useCases();
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSave = async () => {
    if (!saveName.trim()) return;
    await saveCurrentAsCase(saveName.trim());
    setSaveName('');
  };

  const handleNew = () => {
    newCase();
    closeSheet();
  };

  const handleOpen = async (id: string) => { await loadCase(id); closeSheet(); };
  const handleRename = async (id: string) => { if (!editName.trim()) return; await renameCase(id, editName.trim()); setEditingId(null); };
  const handleDelete = async (id: string, name: string) => { if (!confirm(`Usunąć sprawę "${name}"?`)) return; await deleteCase(id); };

  return (
    <div className="space-y-4">
      {/* Zapisz bieżące obliczenia */}
      {activeInput && (
        <div className="bg-base-200 rounded-lg p-4">
          <h4 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-3">
            {activeCaseId ? 'Sprawa zapisana' : 'Zapisz bieżące obliczenia'}
          </h4>
          {activeCaseId ? (
            <p className="text-sm opacity-60">Zmiany zapisują się automatycznie do aktywnej sprawy.</p>
          ) : (
            <div className="join w-full">
              <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Nazwa sprawy (np. Kowalski - Santander 2015)"
                className="input input-bordered join-item flex-1" />
              <button onClick={handleSave} disabled={!saveName.trim()} className="btn btn-primary join-item">Zapisz</button>
            </div>
          )}
        </div>
      )}

      {/* Nowa sprawa */}
      <button onClick={handleNew} className="btn btn-outline btn-sm w-full">
        Nowa sprawa (wyczyść formularz)
      </button>

      {/* Lista spraw */}
      {cases.length === 0 ? (
        <p className="py-4 text-center opacity-50 text-sm">Brak zapisanych spraw.</p>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-bold uppercase tracking-wider opacity-60">Zapisane sprawy</h4>
          {cases.map(c => (
            <div key={c.id} className={`card card-border p-3 ${c.id === activeCaseId ? 'border-primary bg-primary/5' : ''}`}>
              {editingId === c.id ? (
                <div className="flex gap-2 items-center">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="input input-bordered input-sm flex-1" autoFocus />
                  <button onClick={() => handleRename(c.id)} className="btn btn-sm btn-primary">Zapisz</button>
                  <button onClick={() => setEditingId(null)} className="btn btn-sm btn-ghost">Anuluj</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button onClick={() => handleOpen(c.id)} className="flex-1 text-left cursor-pointer min-w-0">
                    <div className="font-medium truncate">
                      {c.name}
                      {c.id === activeCaseId && <span className="badge badge-primary badge-xs ml-2">aktywna</span>}
                    </div>
                    <div className="text-xs opacity-50 mt-0.5">{formatPLN(c.input.loanAmount)} | marża {c.input.margin}% | {c.input.loanPeriodMonths} mies.</div>
                  </button>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="btn btn-ghost btn-xs btn-circle" title="Zmień nazwę"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id, c.name)} className="btn btn-ghost btn-xs btn-circle hover:text-error" title="Usuń"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LawsuitSection />
    </div>
  );
}
