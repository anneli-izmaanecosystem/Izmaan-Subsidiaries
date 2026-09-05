import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, payrollRuns, payrollEntries, employees } from '@/lib/db'
import { eq } from 'drizzle-orm'

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

  const rows = await db
    .select({ entry: payrollEntries, employee: employees })
    .from(payrollEntries)
    .innerJoin(employees, eq(payrollEntries.employeeId, employees.id))
    .where(eq(payrollEntries.runId, rid))

  return NextResponse.json({ run, entries: rows })
}
