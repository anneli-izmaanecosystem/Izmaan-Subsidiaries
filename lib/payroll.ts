// SA BCEA / UIF compliance constants — same figures as Kanaan Hub's payroll engine
// (kanaan-hub/lib/payroll.ts), reused here for consistency across Fuel Finance dashboards.
export const UIF_RATE = 0.01
export const UIF_CAP  = 177.12  // 1% of the R17,712 UIF ceiling wage
export const PAYE_ANNUAL_THRESHOLD = 95_750  // 2025/26 tax year primary rebate threshold —
// confirm against the current SARS tax tables before relying on this for a real filing.

export interface EmployeeForPayroll {
  rateMonth: string | null
}

export interface PayrollEntryInput {
  basicSalary:     number  // usually the employee's rateMonth, but editable per entry
  overtimeAmount:  number
  otherEarnings:   number
  paye:            number  // manual entry — no PAYE calculation engine yet
  shopDeduction:   number
  otherDeductions: number
}

export interface PayrollResult {
  grossPay:           number
  uifEmployee:        number
  uifEmployer:        number
  netPay:             number
  payeThresholdFlag:  boolean  // gross × 12 > PAYE_ANNUAL_THRESHOLD
}

export function calculatePayroll(entry: PayrollEntryInput): PayrollResult {
  const grossPay = entry.basicSalary + entry.overtimeAmount + entry.otherEarnings

  // UIF: 1% each side, capped — same as Kanaan's engine
  const uifEmployee = Math.min(grossPay * UIF_RATE, UIF_CAP)
  const uifEmployer = Math.min(grossPay * UIF_RATE, UIF_CAP)

  const netPay = grossPay - uifEmployee - entry.paye - entry.shopDeduction - entry.otherDeductions

  const payeThresholdFlag = grossPay * 12 > PAYE_ANNUAL_THRESHOLD

  return {
    grossPay:    round2(grossPay),
    uifEmployee: round2(uifEmployee),
    uifEmployer: round2(uifEmployer),
    netPay:      round2(netPay),
    payeThresholdFlag,
  }
}

export function defaultEntry(basicSalary: number): PayrollEntryInput {
  return {
    basicSalary,
    overtimeAmount:  0,
    otherEarnings:   0,
    paye:            0,
    shopDeduction:   0,
    otherDeductions: 0,
  }
}

export function round2(n: number) { return Math.round(n * 100) / 100 }
