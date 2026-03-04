import { useState } from 'react';
import type { LoanInput } from '../utils/calculations';
import { toDateString } from '../utils/formatters';
import { LOAN_TEMPLATES } from '../data/loanTemplates';
import type { LoanTemplate } from '../data/loanTemplates';
import { useCases, useInput } from '../core/CaseContext';

const bankGroups = LOAN_TEMPLATES.reduce<Record<string, LoanTemplate[]>>((acc, tpl) => {
  (acc[tpl.bank] ??= []).push(tpl);
  return acc;
}, {});

export default function LoanForm() {
  const { updateInput, setActiveTab } = useCases();
  const savedInput = useInput();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loanAmount, setLoanAmount] = useState(savedInput ? String(savedInput.loanAmount) : '200000');
  const [margin, setMargin] = useState(savedInput ? savedInput.margin.toFixed(2) : '2.09');
  const [loanPeriod, setLoanPeriod] = useState(savedInput ? String(savedInput.loanPeriodMonths) : '300');
  const [startDate, setStartDate] = useState(savedInput ? toDateString(savedInput.startDate) : '');
  const [bridgeMargin, setBridgeMargin] = useState(savedInput ? savedInput.bridgeMargin.toFixed(2) : '0');
  const [bridgeEndDate, setBridgeEndDate] = useState(savedInput?.bridgeEndDate ? toDateString(savedInput.bridgeEndDate) : '');
  const [showBridge, setShowBridge] = useState(savedInput ? savedInput.bridgeMargin > 0 : false);
  const [paymentDay, setPaymentDay] = useState(savedInput ? String(savedInput.paymentDay) : '30');
  const [templateInfo, setTemplateInfo] = useState<LoanTemplate | null>(null);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = LOAN_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) { setTemplateInfo(null); return; }
    setTemplateInfo(tpl);
    setLoanAmount(tpl.loanAmount.toString());
    setMargin(tpl.margin.toFixed(2));
    setLoanPeriod(tpl.loanPeriodMonths.toString());
    setPaymentDay('30');
    if (tpl.bridgeMargin > 0) {
      setShowBridge(true);
      setBridgeMargin(tpl.bridgeMargin.toFixed(2));
      setBridgeEndDate('');
    } else {
      setShowBridge(false);
      setBridgeMargin('0');
    }
    setStartDate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: LoanInput = {
      loanAmount: parseFloat(loanAmount.replace(/\s/g, '').replace(',', '.')),
      margin: parseFloat(margin.replace(',', '.')),
      loanPeriodMonths: parseInt(loanPeriod),
      startDate: new Date(startDate),
      bridgeMargin: showBridge ? parseFloat(bridgeMargin.replace(',', '.')) : 0,
      bridgeEndDate: showBridge && bridgeEndDate ? new Date(bridgeEndDate) : null,
      paymentDay: parseInt(paymentDay) || 30,
    };
    updateInput(input);
    setActiveTab('summary');
  };

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
      <div className="card-body gap-4">
        <p className="label-caps pb-1">Dane z umowy kredytu</p>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Szablon umowy</legend>
          <select value={selectedTemplate} onChange={e => applyTemplate(e.target.value)} className="select select-bordered w-full">
            <option value="">-- wpisz ręcznie --</option>
            {Object.entries(bankGroups).map(([bank, templates]) => (
              <optgroup key={bank} label={bank}>
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.label} | marża {tpl.margin}% | {tpl.wiborType}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </fieldset>

        {templateInfo && (
          <div className="alert alert-info text-sm">
            <div>
              <p className="font-medium">{templateInfo.bank}</p>
              <p className="text-xs mt-1">
                {templateInfo.wiborType} + {templateInfo.margin}%
                {templateInfo.bridgeMargin > 0 && ` + pomostowa ${templateInfo.bridgeMargin}%`}
                {templateInfo.commission > 0 && ` | prowizja ${templateInfo.commission}%`}
                {' | '}{templateInfo.rateType === 'equal' ? 'raty równe' : 'raty malejące'}
                {' | '}{templateInfo.interestMethod}
              </p>
              <p className="text-xs mt-1 opacity-70">{templateInfo.notes}</p>
              <p className="text-xs mt-1 italic opacity-60">Uzupełnij kwotę, datę uruchomienia i okres z konkretnej umowy.</p>
            </div>
          </div>
        )}

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Kwota kredytu (PLN)</legend>
          <input type="text" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} className="input input-bordered w-full" placeholder="np. 121462.50" required />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Marża banku (%)</legend>
          <input type="text" value={margin} onChange={e => setMargin(e.target.value)} className="input input-bordered w-full" placeholder="np. 2.09" required />
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Okres (miesiące)</legend>
            <input type="number" value={loanPeriod} onChange={e => setLoanPeriod(e.target.value)} className="input input-bordered w-full" placeholder="np. 243" min="1" max="480" required />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Dzień raty</legend>
            <input type="number" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} className="input input-bordered w-full" placeholder="30" min="1" max="31" required />
          </fieldset>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Data uruchomienia kredytu</legend>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input input-bordered w-full" required />
        </fieldset>

        <div className="divider my-0"></div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showBridge} onChange={e => setShowBridge(e.target.checked)} className="checkbox checkbox-sm" />
          <span className="label-text">Marża pomostowa (do czasu wpisu hipoteki)</span>
        </label>
        {showBridge && (
          <div className="ml-6 space-y-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Marża pomostowa (%)</legend>
              <input type="text" value={bridgeMargin} onChange={e => setBridgeMargin(e.target.value)} className="input input-bordered w-full" placeholder="np. 1.00" />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Data zniesienia marży pomostowej</legend>
              <input type="date" value={bridgeEndDate} onChange={e => setBridgeEndDate(e.target.value)} className="input input-bordered w-full" />
            </fieldset>
          </div>
        )}

        <button type="submit" className="btn btn-primary w-full text-lg">Oblicz</button>

        <p className="text-xs text-center opacity-50">
          WIBOR 3M jest pobierany automatycznie z tabeli historycznych stawek. Obliczenia mają charakter szacunkowy/poglądowy.
        </p>
      </div>
    </form>
  );
}
