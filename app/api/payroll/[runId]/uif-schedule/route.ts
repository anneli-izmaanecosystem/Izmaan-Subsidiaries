import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, payrollRuns, payrollEntries, employees, companySettings } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Same shape as the UI-19 Monthly Schedule: employee, ID, gross remuneration,
// 1% employee UIF, 1% employer UIF, total UIF — matches Izmaan's real UI-19 PDF.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { runId } = await params
  const rid = parseInt(runId)

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, rid))
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [settings] = await db.select().from(companySettings)

  const rows = await db
    .select({ entry: payrollEntries, employee: employees })
    .from(payrollEntries)
    .innerJoin(employees, eq(payrollEntries.employeeId, employees.id))
    .where(eq(payrollEntries.runId, rid))

  const employeeRows = rows.map(r => ({
    name:        r.employee.name,
    idNumber:    r.employee.idNumber,
    grossPay:    r.entry.grossPay,
    uifEmployee: r.entry.uifEmployee,
    uifEmployer: r.entry.uifEmployer,
    totalUif:    (parseFloat(r.entry.uifEmployee) + parseFloat(r.entry.uifEmployer)).toFixed(2),
  }))

  const totals = employeeRows.reduce((acc, e) => ({
    grossPay:    acc.grossPay    + parseFloat(e.grossPay),
    uifEmployee: acc.uifEmployee + parseFloat(e.uifEmployee),
    uifEmployer: acc.uifEmployer + parseFloat(e.uifEmployer),
    totalUif:    acc.totalUif    + parseFloat(e.totalUif),
  }), { grossPay: 0, uifEmployee: 0, uifEmployer: 0, totalUif: 0 })

  return NextResponse.json({
    run,
    settings,
    employees: employeeRows,
    totals: {
      grossPay:    totals.grossPay.toFixed(2),
      uifEmployee: totals.uifEmployee.toFixed(2),
      uifEmployer: totals.uifEmployer.toFixed(2),
      totalUif:    totals.totalUif.toFixed(2),
    },
  })
}
