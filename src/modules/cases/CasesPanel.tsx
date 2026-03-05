import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Upload, Eye, X, FileSearch } from 'lucide-react';
import { useCases, useActiveCase, useLawsuitSummary, useResult, useCaseFiles, useActiveBankInfo } from '../../core/CaseContext';
import { openFile, getFile } from '../../core/fileStore';
import { extractTextFromPdf, getDocumentText, type ExtractionProgress } from '../../core/ocrPipeline';
import { formatPLN } from '../../utils/formatters';
import { EVIDENCE_ITEMS } from '../../core/types';
import type { PlaintiffData } from '../../core/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EvidenceRow({ evidenceKey, label }: { evidenceKey: string; label: string }) {
  const { uploadEvidence, deleteEvidence, activeCaseId, openSheetModule } = useCases();
  const caseFiles = useCaseFiles();
  const inputRef = useRef<HTMLInputElement>(null);
  const file = caseFiles.find(f => f.evidenceKey === evidenceKey);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [hasText, setHasText] = useState(false);

  const isPdf = file?.mimeType === 'application/pdf';
  const canAnalyze = evidenceKey === 'contract' && isPdf;

  useEffect(() => {
    if (activeCaseId && file) {
      getDocumentText(activeCaseId, evidenceKey).then(dt => setHasText(!!dt));
    }
  }, [activeCaseId, file, evidenceKey]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await uploadEvidence(evidenceKey, f);
    if (inputRef.current) inputRef.current.value = '';
    setHasText(false);
  };

  const handlePreview = async () => {
    if (!activeCaseId || !file) return;
    await openFile(activeCaseId, evidenceKey, file.fileName);
  };

  const handleExtract = async () => {
    if (!activeCaseId || !file) return;
    const rawFile = await getFile(activeCaseId, evidenceKey);
    if (!rawFile) return;
    setExtracting(true);
    setProgress(null);
    try {
      await extractTextFromPdf(rawFile, activeCaseId, evidenceKey, setProgress);
      setHasText(true);
      openSheetModule('documentAnalysis');
    } catch (err) {
      console.error('[OCR] Extraction failed:', err);
      alert('Nie udało się przetworzyć PDF. Spróbuj ponownie.');
    } finally {
      setExtracting(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input type="checkbox" className="checkbox checkbox-sm" checked={!!file} readOnly />
        <div className="flex-1 min-w-0">
          <span className="text-sm">{label}</span>
          {file && (
            <span className="text-xs opacity-40 ml-2 truncate">{file.fileName} ({formatSize(file.size)})</span>
          )}
        </div>
        {file ? (
          <div className="flex gap-1 shrink-0">
            {canAnalyze && (
              <button
                onClick={hasText ? () => openSheetModule('documentAnalysis') : handleExtract}
                disabled={extracting}
                className={`btn btn-ghost btn-xs ${hasText ? 'text-success' : 'text-primary'}`}
                title={hasText ? 'Zobacz analizę' : 'Analizuj PDF'}
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span className="text-[10px]">{hasText ? 'Analiza' : 'Analizuj'}</span>
              </button>
            )}
            <button onClick={handlePreview} className="btn btn-ghost btn-xs btn-circle" title="Podgląd"><Eye className="w-3.5 h-3.5" /></button>
            <button onClick={() => deleteEvidence(evidenceKey)} className="btn btn-ghost btn-xs btn-circle hover:text-error" title="Usuń"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} className="btn btn-ghost btn-xs shrink-0 gap-1">
            <Upload className="w-3.5 h-3.5" />Dodaj
          </button>
        )}
        <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      </div>
      {extracting && progress && (
        <div className="ml-7">
          <progress className="progress progress-primary w-full h-1.5" value={progress.page} max={progress.totalPages} />
          <p className="text-[10px] opacity-50 mt-0.5">
            {progress.status === 'init' ? 'Ładowanie modelu OCR...' : `OCR strona ${progress.page}/${progress.totalPages}`}
          </p>
        </div>
      )}
    </div>
  );
}

function LawsuitSection() {
  const activeCase = useActiveCase();
  const { updateLawsuit } = useCases();
  const summary = useLawsuitSummary();
  const result = useResult();
  const bankInfo = useActiveBankInfo();

  if (!activeCase || !result) return null;
  const { lawsuit } = activeCase;

  const updatePlaintiff = (patch: Partial<PlaintiffData>) => {
    updateLawsuit({ plaintiff: { ...lawsuit.plaintiff, ...patch } });
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

      {bankInfo ? (
        <div className="bg-base-200 rounded-lg p-3 text-xs space-y-1">
          <p className="font-bold text-sm">Pozwany</p>
          <p>{bankInfo.bank.legalName}</p>
          <p><span className="opacity-50">KRS:</span> {bankInfo.bank.krs} <span className="opacity-50 ml-2">NIP:</span> {bankInfo.bank.nip}</p>
          <p><span className="opacity-50">Adres:</span> {bankInfo.bank.address}</p>
        </div>
      ) : (
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
              <div className="stat-desc">Różnica w odsetkach (scenariusz bez WIBOR)</div>
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

      <div className="divider text-xs opacity-50">Dowody — dokumenty</div>

      <div className="space-y-2">
        {Object.entries(EVIDENCE_ITEMS).map(([key, label]) => (
          <EvidenceRow key={key} evidenceKey={key} label={label} />
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
                placeholder="Nazwa sprawy (np. Kredyt 2015)"
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
