import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, employees } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  for (const key of [
    'employeeNumber', 'name', 'knownAs', 'idNumber', 'department', 'jobTitle',
    'paypoint', 'dateEngaged', 'bankName', 'bankAccount', 'branchCode', 'active', 'notes',
  ]) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  // dateEngaged is a `date` column — an empty string (field left blank in the form)
  // is not a valid date and would crash the update; treat it as "clear the field".
  if (updates.dateEngaged === '') updates.dateEngaged = null

  if (body.rateMonth !== undefined) updates.rateMonth = String(body.rateMonth)

  try {
    const [row] = await db.update(employees).set(updates).where(eq(employees.id, parseInt(id))).returning()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(row)
  } catch (err) {
    console.error('[employees PATCH]', err)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}
