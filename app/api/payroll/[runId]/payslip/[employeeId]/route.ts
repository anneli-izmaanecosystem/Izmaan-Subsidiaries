import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, payrollRuns, payrollEntries, employees, companySettings } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string; employeeId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { runId, employeeId } = await params
  const rid = parseInt(runId)
  const eid = parseInt(employeeId)

  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, rid))
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const [row] = await db
    .select({ entry: payrollEntries, employee: employees })
    .from(payrollEntries)
    .innerJoin(employees, eq(payrollEntries.employeeId, employees.id))
    .where(and(eq(payrollEntries.runId, rid), eq(payrollEntries.employeeId, eid)))

  if (!row) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const [settings] = await db.select().from(companySettings)

  return NextResponse.json({ run, settings, employee: row.employee, entry: row.entry })
}
