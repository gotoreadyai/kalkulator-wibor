import { getWiborRate as getDefaultWiborRate } from '../data/wiborRates';
import { daysBetween } from './formatters';

export interface WiborEntry {
  date: string;  // YYYY-MM-DD
  rate: number;
}

export interface LoanInput {
  loanAmount: number;        // kwota kredytu
  margin: number;            // marża banku (%)
  loanPeriodMonths: number;  // okres kredytowania w miesiącach
  startDate: Date;           // data uruchomienia kredytu
  bridgeMargin: number;      // marża pomostowa (%)
  bridgeEndDate: Date | null; // data zniesienia marży pomostowej
  paymentDay: number;        // dzień miesiąca spłaty raty (1-30)
  wiborData?: WiborEntry[];  // zewnętrzne dane WIBOR (opcjonalne)
}

/**
 * Pobiera stawkę WIBOR na daną datę z zewnętrznych danych lub domyślnych
 */
function resolveWiborRate(date: Date, wiborData?: WiborEntry[]): number {
  if (!wiborData || wiborData.length === 0) {
    return getDefaultWiborRate(date);
  }

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // Szukaj ostatniego wpisu <= data
  let bestRate = wiborData[0].rate;
  for (const entry of wiborData) {
    if (entry.date <= dateStr) {
      bestRate = entry.rate;
    } else {
      break;
    }
  }
  return bestRate;
}

export interface InstallmentRow {
  number: number;
  date: Date;
  prevDate: Date;
  days: number;
  wiborRate: number;
  totalRate: number;
  installment: number;       // rata łączna
  principal: number;         // kapitał
  interestTotal: number;     // odsetki łącznie
  interestWibor: number;     // odsetki z WIBOR
  interestMargin: number;    // odsetki z marży
  interestBridge: number;    // odsetki z marży pomostowej
  remainingBalance: number;  // saldo po spłacie
  isPast: boolean;           // czy już zapłacone
}

export interface InstallmentRowNoWibor {
  number: number;
  date: Date;
  installment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface CalculationResult {
  schedule: InstallmentRow[];
  scheduleNoWibor: InstallmentRowNoWibor[];

  pastTotalPaid: number;
  pastPrincipalPaid: number;
  pastInterestTotal: number;
  pastInterestWibor: number;
  pastInterestMargin: number;
  pastInterestBridge: number;
  pastInstallmentsCount: number;

  futureTotalToPay: number;
  futurePrincipalToPay: number;
  futureInterestTotal: number;
  futureInterestWibor: number;
  futureInterestMargin: number;
  futureInstallmentsCount: number;

  pastTotalPaidNoWibor: number;
  pastInterestNoWibor: number;
  pastPrincipalNoWibor: number;

  futureTotalNoWibor: number;
  futureInterestNoWibor: number;

  overpaidInterest: number;
  futureSavings: number;
  currentInstallment: number;
  installmentNoWibor: number;
}

/**
 * Oblicza datę płatności raty.
 * Pierwsza rata: następny miesiąc po uruchomieniu na podany dzień.
 * Kolejne: co miesiąc na ten sam dzień.
 */
function getPaymentDate(startDate: Date, monthOffset: number, paymentDay: number): Date {
  // Pierwsza rata w miesiącu następnym po uruchomieniu
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + monthOffset;

  // Oblicz rok i miesiąc
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = month % 12;

  // Sprawdź ile dni ma docelowy miesiąc
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const actualDay = Math.min(paymentDay, daysInMonth);

  return new Date(targetYear, targetMonth, actualDay);
}

/**
 * Oblicza ratę annuitetową (równą)
 */
function calculateAnnuityPayment(
  balance: number,
  annualRate: number,
  remainingMonths: number
): number {
  if (annualRate <= 0 || remainingMonths <= 0) {
    return remainingMonths > 0 ? balance / remainingMonths : balance;
  }
  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, remainingMonths);
  return balance * (monthlyRate * factor) / (factor - 1);
}

/**
 * Oblicza odsetki za okres (metoda actual/360)
 */
function calculateInterest(
  balance: number,
  annualRatePercent: number,
  days: number
): number {
  return balance * (annualRatePercent / 100) * days / 360;
}

/**
 * Główna funkcja obliczeniowa
 */
export function calculateLoan(input: LoanInput): CalculationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedule: InstallmentRow[] = [];
  const scheduleNoWibor: InstallmentRowNoWibor[] = [];

  let balance = input.loanAmount;
  let balanceNoWibor = input.loanAmount;

  // Okres odsetkowy zaczyna się od daty uruchomienia
  let prevDate = new Date(input.startDate);

  // Początkowy WIBOR - z daty uruchomienia (w praktyce z daty decyzji kredytowej)
  let currentWibor = resolveWiborRate(input.startDate, input.wiborData);
  let installmentAmount = 0;
  let installmentNoWiborAmount = 0;

  // Śledź kiedy WIBOR się resetuje (co 3 miesiące)
  let monthsSinceReset = 0;

  for (let i = 1; i <= input.loanPeriodMonths; i++) {
    // Data płatności: pierwszy miesiąc po uruchomieniu + offset
    const paymentDate = getPaymentDate(input.startDate, i, input.paymentDay);
    const days = daysBetween(prevDate, paymentDate);
    const remainingMonths = input.loanPeriodMonths - i + 1;

    // Czy marża pomostowa jest aktywna?
    const bridgeActive = input.bridgeEndDate
      ? paymentDate <= input.bridgeEndDate
      : false;
    const effectiveBridgeMargin = bridgeActive ? input.bridgeMargin : 0;

    // Co 3 miesiące resetuj WIBOR i przelicz ratę
    monthsSinceReset++;
    if (monthsSinceReset >= 3 || i === 1) {
      // Dla pierwszego okresu używamy WIBOR z daty uruchomienia/decyzji
      if (i > 1) {
        currentWibor = resolveWiborRate(paymentDate, input.wiborData);
      }
      monthsSinceReset = 0;

      // Przelicz ratę annuitetową
      const totalRate = currentWibor + input.margin + effectiveBridgeMargin;
      installmentAmount = calculateAnnuityPayment(balance, totalRate, remainingMonths);

      // Rata bez WIBOR
      const rateNoWibor = input.margin + effectiveBridgeMargin;
      installmentNoWiborAmount = calculateAnnuityPayment(balanceNoWibor, rateNoWibor, remainingMonths);
    }

    const totalRate = currentWibor + input.margin + effectiveBridgeMargin;

    // Odsetki
    const interestWibor = calculateInterest(balance, currentWibor, days);
    const interestMargin = calculateInterest(balance, input.margin, days);
    const interestBridge = calculateInterest(balance, effectiveBridgeMargin, days);
    const interestTotal = interestWibor + interestMargin + interestBridge;

    // Kapitał
    let principal = installmentAmount - interestTotal;

    // Zabezpieczenia
    if (principal < 0) principal = 0;
    if (i === input.loanPeriodMonths || principal > balance) {
      principal = balance;
    }

    const isPast = paymentDate <= today;
    const actualInstallment = principal + interestTotal;

    schedule.push({
      number: i,
      date: paymentDate,
      prevDate: new Date(prevDate),
      days,
      wiborRate: currentWibor,
      totalRate,
      installment: actualInstallment,
      principal,
      interestTotal,
      interestWibor,
      interestMargin,
      interestBridge,
      remainingBalance: balance - principal,
      isPast,
    });

    balance -= principal;
    if (balance < 0.01) balance = 0;

    // --- Scenariusz bez WIBOR ---
    const rateNoWibor = input.margin + effectiveBridgeMargin;
    const interestNoWibor = calculateInterest(balanceNoWibor, rateNoWibor, days);
    let principalNoWibor = installmentNoWiborAmount - interestNoWibor;

    if (principalNoWibor < 0) principalNoWibor = 0;
    if (i === input.loanPeriodMonths || principalNoWibor > balanceNoWibor) {
      principalNoWibor = balanceNoWibor;
    }

    scheduleNoWibor.push({
      number: i,
      date: paymentDate,
      installment: principalNoWibor + interestNoWibor,
      principal: principalNoWibor,
      interest: interestNoWibor,
      remainingBalance: balanceNoWibor - principalNoWibor,
    });

    balanceNoWibor -= principalNoWibor;
    if (balanceNoWibor < 0.01) balanceNoWibor = 0;

    prevDate = paymentDate;
  }

  // Podsumowania
  const pastRows = schedule.filter(r => r.isPast);
  const futureRows = schedule.filter(r => !r.isPast);
  const pastRowsNoWibor = scheduleNoWibor.filter((_, i) => schedule[i].isPast);
  const futureRowsNoWibor = scheduleNoWibor.filter((_, i) => !schedule[i].isPast);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const result: CalculationResult = {
    schedule,
    scheduleNoWibor,

    pastTotalPaid: sum(pastRows.map(r => r.installment)),
    pastPrincipalPaid: sum(pastRows.map(r => r.principal)),
    pastInterestTotal: sum(pastRows.map(r => r.interestTotal)),
    pastInterestWibor: sum(pastRows.map(r => r.interestWibor)),
    pastInterestMargin: sum(pastRows.map(r => r.interestMargin)),
    pastInterestBridge: sum(pastRows.map(r => r.interestBridge)),
    pastInstallmentsCount: pastRows.length,

    futureTotalToPay: sum(futureRows.map(r => r.installment)),
    futurePrincipalToPay: sum(futureRows.map(r => r.principal)),
    futureInterestTotal: sum(futureRows.map(r => r.interestTotal)),
    futureInterestWibor: sum(futureRows.map(r => r.interestWibor)),
    futureInterestMargin: sum(futureRows.map(r => r.interestMargin)),
    futureInstallmentsCount: futureRows.length,

    pastTotalPaidNoWibor: sum(pastRowsNoWibor.map(r => r.installment)),
    pastInterestNoWibor: sum(pastRowsNoWibor.map(r => r.interest)),
    pastPrincipalNoWibor: sum(pastRowsNoWibor.map(r => r.principal)),

    futureTotalNoWibor: sum(futureRowsNoWibor.map(r => r.installment)),
    futureInterestNoWibor: sum(futureRowsNoWibor.map(r => r.interest)),

    overpaidInterest: sum(pastRows.map(r => r.interestTotal)) - sum(pastRowsNoWibor.map(r => r.interest)),
    futureSavings: sum(futureRows.map(r => r.installment)) - sum(futureRowsNoWibor.map(r => r.installment)),

    currentInstallment: futureRows.length > 0 ? futureRows[0].installment : 0,
    installmentNoWibor: futureRowsNoWibor.length > 0 ? futureRowsNoWibor[0].installment : 0,
  };

  return result;
}
