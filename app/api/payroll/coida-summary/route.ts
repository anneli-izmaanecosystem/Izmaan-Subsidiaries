import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, payrollRuns, payrollEntries, employees } from '@/lib/db'
import { and, gte, lte, inArray, eq } from 'drizzle-orm'

// GET /api/payroll/coida-summary?start=YYYY-MM-DD&end=YYYY-MM-DD
// Sums gross pay / deductions / net pay / UIF per employee across every finalised
// run whose period falls within [start, end] — the data a COIDA Return of Earnings
// needs. No levy/tariff calculation here (Izmaan's Compensation Fund tariff rate
// isn't something this app should guess at) — this is an earnings export only,
// same as Kanaan Hub's coida-summary route.
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')
  if (!start || !end) return NextResponse.json({ error: 'Missing start/end date' }, { status: 400 })

  const runs = await db.select().from(payrollRuns).where(and(
    gte(payrollRuns.periodStart, start),
    lte(payrollRuns.periodEnd, end),
  ))

  const runIds = runs.map(r => r.id)
  if (runIds.length === 0) {
    return NextResponse.json({ employees: [], totals: { grossPay: '0', deductions: '0', netPay: '0', uifEmployee: '0' }, runsIncluded: 0 })
  }

  const rows = await db
    .select({ entry: payrollEntries, employee: employees })
    .from(payrollEntries)
    .innerJoin(employees, eq(payrollEntries.employeeId, employees.id))
    .where(inArray(payrollEntries.runId, runIds))

  const byEmployee = new Map<number, {
    id: number; name: string; idNumber: string | null
    grossPay: number; deductions: number; netPay: number; uifEmployee: number
  }>()

  for (const { entry, employee } of rows) {
    const gross = parseFloat(entry.grossPay)
    const net   = parseFloat(entry.netPay)
    const ded   = parseFloat(entry.paye) + parseFloat(entry.shopDeduction) + parseFloat(entry.otherDeductions)
    const uif   = parseFloat(entry.uifEmployee)

    const acc = byEmployee.get(employee.id) ?? { id: employee.id, name: employee.name, idNumber: employee.idNumber, grossPay: 0, deductions: 0, netPay: 0, uifEmployee: 0 }
    acc.grossPay    += gross
    acc.deductions  += ded
    acc.netPay      += net
    acc.uifEmployee += uif
    byEmployee.set(employee.id, acc)
  }

  const employeeList = Array.from(byEmployee.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => ({
      ...e,
      grossPay:    e.grossPay.toFixed(2),
      deductions:  e.deductions.toFixed(2),
      netPay:      e.netPay.toFixed(2),
      uifEmployee: e.uifEmployee.toFixed(2),
    }))

  const totals = employeeList.reduce((acc, e) => ({
    grossPay:    acc.grossPay    + parseFloat(e.grossPay),
    deductions:  acc.deductions  + parseFloat(e.deductions),
    netPay:      acc.netPay      + parseFloat(e.netPay),
    uifEmployee: acc.uifEmployee + parseFloat(e.uifEmployee),
  }), { grossPay: 0, deductions: 0, netPay: 0, uifEmployee: 0 })

  return NextResponse.json({
    employees: employeeList,
    totals: {
      grossPay:    totals.grossPay.toFixed(2),
      deductions:  totals.deductions.toFixed(2),
      netPay:      totals.netPay.toFixed(2),
      uifEmployee: totals.uifEmployee.toFixed(2),
    },
    runsIncluded: runIds.length,
  })
}
