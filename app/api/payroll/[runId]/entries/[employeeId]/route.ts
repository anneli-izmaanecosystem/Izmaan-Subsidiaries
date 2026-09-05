import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, payrollRuns, payrollEntries } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { calculatePayroll } from '@/lib/payroll'

// Recomputes UIF/gross/net server-side on every save — the client never sends
// pre-computed totals, so the numbers can't drift from lib/payroll.ts's logic.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string; employeeId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { runId, employeeId } = await params
  const rid = parseInt(runId)
  const eid = parseInt(employeeId)

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, rid))
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if (run.status === 'finalised') {
    return NextResponse.json({ error: 'Run is finalised — reopen it before editing' }, { status: 409 })
  }

  const body = await req.json()
  const basicSalary     = parseFloat(body.basicSalary ?? '0')
  const overtimeAmount  = parseFloat(body.overtimeAmount ?? '0')
  const otherEarnings   = parseFloat(body.otherEarnings ?? '0')
  const paye            = parseFloat(body.paye ?? '0')
  const shopDeduction   = parseFloat(body.shopDeduction ?? '0')
  const otherDeductions = parseFloat(body.otherDeductions ?? '0')

  const result = calculatePayroll({ basicSalary, overtimeAmount, otherEarnings, paye, shopDeduction, otherDeductions })

  const [row] = await db.update(payrollEntries).set({
    basicSalary:          String(basicSalary),
    overtimeAmount:       String(overtimeAmount),
    overtimeLabel:        body.overtimeLabel ?? null,
    otherEarnings:        String(otherEarnings),
    otherEarningsLabel:   body.otherEarningsLabel ?? null,
    paye:                 String(paye),
    shopDeduction:        String(shopDeduction),
    otherDeductions:      String(otherDeductions),
    otherDeductionsLabel: body.otherDeductionsLabel ?? null,
    uifEmployee:          String(result.uifEmployee),
    uifEmployer:          String(result.uifEmployer),
    grossPay:             String(result.grossPay),
    netPay:               String(result.netPay),
    payeThresholdFlag:    result.payeThresholdFlag,
    notes:                body.notes ?? null,
  }).where(and(eq(payrollEntries.runId, rid), eq(payrollEntries.employeeId, eid))).returning()

  if (!row) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  return NextResponse.json(row)
}
