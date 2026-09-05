import { pgTable, pgEnum, serial, text, integer, numeric, date, boolean, timestamp, unique } from 'drizzle-orm/pg-core'

export const payrollStatusEnum = pgEnum('payroll_status', ['draft', 'finalised'])

// ── Company settings (single row — Izmaan is one entity, unlike Kanaan's multi-entity setup) ──
export const companySettings = pgTable('company_settings', {
  id:       serial('id').primaryKey(),
  name:     text('name').notNull(),
  address:  text('address'),
  uifRef:   text('uif_ref'),
  payeRef:  text('paye_ref'),
  coidRef:  text('coid_ref'),
})

// ── Employees ───────────────────────────────────────────────────────────────
export const employees = pgTable('employees', {
  id:             serial('id').primaryKey(),
  employeeNumber: text('employee_number'),
  name:           text('name').notNull(),
  knownAs:        text('known_as'),
  idNumber:       text('id_number'),
  department:     text('department'),
  jobTitle:       text('job_title'),
  paypoint:       text('paypoint'),
  dateEngaged:    date('date_engaged'),
  rateMonth:      numeric('rate_month', { precision: 10, scale: 2 }).notNull(), // Rate Per Month
  bankName:       text('bank_name'),
  bankAccount:    text('bank_account'),
  branchCode:     text('branch_code'),
  active:         boolean('active').notNull().default(true),
  notes:          text('notes'),
})

// ── Payroll runs (one per month) ───────────────────────────────────────────
export const payrollRuns = pgTable('payroll_runs', {
  id:          serial('id').primaryKey(),
  periodStart: date('period_start').notNull(),
  periodEnd:   date('period_end').notNull(),
  status:      payrollStatusEnum('status').notNull().default('draft'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, t => [unique('payroll_runs_period_unique').on(t.periodStart, t.periodEnd)])

// ── Payroll entries (one per employee per run) — mirrors the payslip's own line items ──
export const payrollEntries = pgTable('payroll_entries', {
  id:         serial('id').primaryKey(),
  runId:      integer('run_id').notNull().references(() => payrollRuns.id),
  employeeId: integer('employee_id').notNull().references(() => employees.id),

  // earnings — snapshotted at entry time so a later rate change doesn't rewrite history
  basicSalary:   numeric('basic_salary',   { precision: 10, scale: 2 }).notNull().default('0'),
  overtimeAmount: numeric('overtime_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  overtimeLabel: text('overtime_label'), // e.g. "Overtime (5 Shifts)" — free text, matches payslip convention
  otherEarnings: numeric('other_earnings', { precision: 10, scale: 2 }).notNull().default('0'),
  otherEarningsLabel: text('other_earnings_label'),

  // deductions
  uifEmployee:     numeric('uif_employee',     { precision: 10, scale: 2 }).notNull().default('0'),
  uifEmployer:     numeric('uif_employer',     { precision: 10, scale: 2 }).notNull().default('0'), // company contribution, not deducted from pay
  paye:            numeric('paye',             { precision: 10, scale: 2 }).notNull().default('0'), // manual entry — no PAYE calculation engine yet
  shopDeduction:   numeric('shop_deduction',   { precision: 10, scale: 2 }).notNull().default('0'),
  otherDeductions: numeric('other_deductions', { precision: 10, scale: 2 }).notNull().default('0'),
  otherDeductionsLabel: text('other_deductions_label'),

  // totals — computed server-side on save, stored for fast reads / payslip rendering
  grossPay: numeric('gross_pay', { precision: 10, scale: 2 }).notNull().default('0'),
  netPay:   numeric('net_pay',   { precision: 10, scale: 2 }).notNull().default('0'),

  // flags
  payeThresholdFlag: boolean('paye_threshold_flag').notNull().default(false), // annualised gross > SARS tax threshold

  notes: text('notes'),
}, t => [unique('payroll_entries_run_employee_unique').on(t.runId, t.employeeId)])
