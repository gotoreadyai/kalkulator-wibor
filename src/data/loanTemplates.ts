export interface Bank {
  id: string;
  name: string;
  legalName: string;
  krs: string;
  nip: string;
  address: string;
  formerNames: string[];
}

export interface LawsuitBasis {
  directive: '93/13' | '2014/17' | 'both';
  esisProvided: boolean | null;
  uokikClauseNumbers: string[];
  notes: string;
}

export interface LoanTemplate {
  id: string;
  label: string;
  bankId: string;
  period: string;
  loanAmount: number;
  margin: number;
  bridgeMargin: number;
  loanPeriodMonths: number;
  wiborType: '3M' | '6M';
  rateType: 'equal' | 'decreasing';
  interestMethod: '365/360' | '30/360';
  commission: number;
  notes: string;
  lawsuitBasis: LawsuitBasis;
}
