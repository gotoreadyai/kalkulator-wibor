import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Scale, AlertTriangle } from 'lucide-react';
import type { LoanTemplate, LawsuitBasis, Bank } from '../../data/loanTemplates';
import { useCases, useBanks, useTemplates } from '../../core/CaseContext';

const DIRECTIVE_LABELS: Record<string, string> = {
  '93/13': 'Dyrektywa 93/13 (klauzule abuzywne)',
  '2014/17': 'Dyrektywa 2014/17 (obowiązek ESIS)',
  'both': 'Dyrektywa 93/13 + 2014/17 (ESIS)',
};

function LawsuitInfo({ basis }: { basis: LawsuitBasis }) {
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-1.5">
        <Scale className="w-3 h-3 text-info shrink-0" />
        <span className="text-xs text-info">{DIRECTIVE_LABELS[basis.directive] ?? basis.directive}</span>
      </div>
      {basis.uokikClauseNumbers.length > 0 && (
        <p className="text-xs opacity-50">
          Rejestr UOKiK: klauzula {basis.uokikClauseNumbers.join(', ')}
        </p>
      )}
      <p className="text-xs opacity-40 italic">{basis.notes}</p>
    </div>
  );
}

function BankCard({ bank, templates }: { bank: Bank; templates: LoanTemplate[] }) {
  const [open, setOpen] = useState(false);
  const { applyTemplate, closeSheet } = useCases();

  const handleSelect = (tpl: LoanTemplate) => {
    applyTemplate(tpl.id);
    closeSheet();
  };

  return (
    <div className="card card-border">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 cursor-pointer flex items-center gap-3">
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium">{bank.name}</div>
          {bank.formerNames.length > 0 && (
            <div className="text-xs opacity-40 mt-0.5">d. {bank.formerNames.join(', ')}</div>
          )}
        </div>
        <span className="badge badge-sm badge-ghost">{templates.length}</span>
      </button>

      {open && (
        <div className="border-t border-base-300">
          <div className="px-4 py-3 bg-base-200/50 text-xs space-y-1">
            <p><span className="opacity-50">KRS:</span> {bank.krs}</p>
            <p><span className="opacity-50">NIP:</span> {bank.nip}</p>
            <p><span className="opacity-50">Adres:</span> {bank.address}</p>
          </div>
          <div className="divide-y divide-base-300">
            {templates.map(tpl => (
              <div key={tpl.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{tpl.label}</div>
                  <div className="text-xs opacity-50 mt-1">
                    {tpl.wiborType} + {tpl.margin}%
                    {tpl.bridgeMargin > 0 && ` + pomostowa ${tpl.bridgeMargin}%`}
                    {tpl.commission > 0 && ` | prowizja ${tpl.commission}%`}
                    {' | '}{tpl.rateType === 'equal' ? 'raty równe' : 'raty malejące'}
                  </div>
                  <div className="text-xs opacity-40 mt-0.5">{tpl.notes}</div>
                  <LawsuitInfo basis={tpl.lawsuitBasis} />
                </div>
                <button onClick={() => handleSelect(tpl)} className="btn btn-primary btn-sm shrink-0">Użyj</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TemplatesPanel() {
  const banks = useBanks();
  const templates = useTemplates();

  const templatesByBank = useMemo(() =>
    banks.map(bank => ({
      bank,
      templates: templates.filter(t => t.bankId === bank.id),
    })).filter(g => g.templates.length > 0),
    [banks, templates],
  );

  if (templates.length === 0) {
    return <p className="py-8 text-center opacity-50 text-sm">Ładowanie szablonów umów...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm opacity-60">Wybierz wzór umowy kredytowej. Dane zostaną wpisane do formularza — uzupełnij kwotę, datę i okres z konkretnej umowy.</p>

      {templatesByBank.map(({ bank, templates }) => (
        <BankCard key={bank.id} bank={bank} templates={templates} />
      ))}

      <div className="alert alert-warning text-xs mt-4">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <div>
          <p className="font-medium">Ważne zastrzeżenie</p>
          <p className="mt-1">Kwalifikacja umowy do pozwu zależy od indywidualnych okoliczności: treści konkretnej umowy, daty zawarcia, dostarczonych dokumentów (formularz ESIS) i realizacji obowiązków informacyjnych przez bank. Informacje o podstawach prawnych mają charakter orientacyjny i nie zastępują analizy prawnej.</p>
        </div>
      </div>
    </div>
  );
}
