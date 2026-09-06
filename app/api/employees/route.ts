import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, employees } from '@/lib/db'
import { asc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows = await db.select().from(employees).orderBy(asc(employees.name))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  if (!body.name || body.rateMonth === undefined) {
    return NextResponse.json({ error: 'name and rateMonth are required' }, { status: 400 })
  }

  try {
    const [row] = await db.insert(employees).values({
      employeeNumber: body.employeeNumber ?? null,
      name:           body.name,
      knownAs:        body.knownAs ?? null,
      idNumber:       body.idNumber ?? null,
      department:     body.department ?? null,
      jobTitle:       body.jobTitle ?? null,
      paypoint:       body.paypoint ?? null,
      dateEngaged:    body.dateEngaged || null, // an empty string is not a valid date — treat as unset
      rateMonth:      String(body.rateMonth),
      bankName:       body.bankName ?? null,
      bankAccount:    body.bankAccount ?? null,
      branchCode:     body.branchCode ?? null,
      notes:          body.notes ?? null,
    }).returning()

    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    console.error('[employees POST]', err)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
