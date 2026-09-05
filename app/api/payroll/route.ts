import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, payrollRuns, payrollEntries, employees } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { calculatePayroll, defaultEntry } from '@/lib/payroll'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const runs = await db.select().from(payrollRuns).orderBy(desc(payrollRuns.periodStart))
  return NextResponse.json(runs)
}

// Creates a run for the given month and seeds one entry per active employee,
// prefilled with their current rateMonth as basic salary.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { periodStart, periodEnd } = await req.json()
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 })
  }

  const [run] = await db.insert(payrollRuns).values({ periodStart, periodEnd }).returning()

  const activeEmployees = await db.select().from(employees).where(eq(employees.active, true))

  if (activeEmployees.length > 0) {
    await db.insert(payrollEntries).values(activeEmployees.map(emp => {
      const basicSalary = parseFloat(emp.rateMonth)
      const result = calculatePayroll(defaultEntry(basicSalary))
      return {
        runId:       run.id,
        employeeId:  emp.id,
        basicSalary: String(basicSalary),
        uifEmployee: String(result.uifEmployee),
        uifEmployer: String(result.uifEmployer),
        grossPay:    String(result.grossPay),
        netPay:      String(result.netPay),
        payeThresholdFlag: result.payeThresholdFlag,
      }
    }))
  }

  return NextResponse.json(run, { status: 201 })
}
