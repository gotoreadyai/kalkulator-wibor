import type { WiborEntry } from '../utils/calculations';

export interface StoredLoanInput {
  loanAmount: number;
  margin: number;
  loanPeriodMonths: number;
  startDate: string;
  bridgeMargin: number;
  bridgeEndDate: string | null;
  paymentDay: number;
}

export interface PlaintiffData {
  name: string;
  address: string;
  pesel: string;
}

export interface LawsuitData {
  plaintiff: PlaintiffData;
  courtName: string;
  demandDate: string | null;
}

export interface CaseFile {
  id: string;          // `${caseId}/${evidenceKey}`
  caseId: string;
  evidenceKey: string; // key from EVIDENCE_ITEMS
  fileName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export const EVIDENCE_ITEMS: Record<string, string> = {
  contract: 'Umowa kredytu',
  annexes: 'Aneksy do umowy',
  certificate: 'Zaświadczenie z banku o historii spłat',
  esis: 'Formularz ESIS (jeśli otrzymany)',
  demand: 'Wezwanie do zapłaty (kopia)',
  demandProof: 'Potwierdzenie nadania wezwania',
  repaymentHistory: 'Historia spłat rat kredytu',
};

export interface Case {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  input: StoredLoanInput;
  templateId: string | null;
  wiborDatasetId: string | null;
  lawsuit: LawsuitData;
}

export interface PageText {
  pageNum: number;
  text: string;
  method: 'ocr';
  confidence?: number;
}

export interface DocumentText {
  id: string;           // `${caseId}/${evidenceKey}`
  caseId: string;
  evidenceKey: string;
  pages: PageText[];
  extractedAt: string;
}

export interface WiborDataset {
  id: string;
  name: string;
  createdAt: string;
  entries: WiborEntry[];
}
