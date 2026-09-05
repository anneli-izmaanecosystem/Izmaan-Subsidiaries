import { config } from 'dotenv'
config({ path: '.env.local' })
import { db } from './index'
import * as schema from './schema'

async function seed() {
  console.log('Seeding Izmaan Payroll...')

  // Address per the UI-19 UIF schedule (the authoritative government-facing document) —
  // the payslip sheet shows a slightly different "P/a Farm MS141, MUSINA"; confirm with
  // Anneli which is current before relying on either for official correspondence.
  const [settings] = await db.insert(schema.companySettings).values({
    name:    'Izmaan Property Developments',
    address: 'River Farm, Musina, MS140, Limpopo, 0900',
    uifRef:  '2880316/6',
  }).onConflictDoNothing().returning()
  console.log('Company settings:', settings?.name ?? '(already seeded)')

  // Only the two current employees confirmed against the Jul 2026 UI-19 schedule.
  // Ndou's department/job title/bank details weren't reliable in the source payslip
  // sheet (that row had Joubert's details copy-pasted into it) — left blank pending
  // the real details from Anneli, rather than guessed.
  const employeeRows = await db.insert(schema.employees).values([
    {
      employeeNumber: '003',
      name:        'Handre Pieter Joubert',
      knownAs:     'Handre',
      idNumber:    '0501286518086',
      department:  'Road Safety',
      jobTitle:    'Safety Officer',
      paypoint:    'Izmaan Property Developments',
      dateEngaged: '2025-10-01',
      rateMonth:   '8000.00',
      bankName:    'FNB',
      bankAccount: '62599844513',
      branchCode:  '250655',
    },
    {
      employeeNumber: '004',
      name:        'Ndou, HR',
      idNumber:    '7510115992084',
      paypoint:    'Izmaan Property Developments',
      rateMonth:   '6500.00',
      notes:       'Department, job title, date engaged and bank details need confirming — not reliable in the source payslip sheet for this employee.',
    },
  ]).onConflictDoNothing().returning()
  console.log('Employees:', employeeRows.map(e => e.name).join(', '))

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
