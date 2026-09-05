'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Plus } from 'lucide-react'

type Employee = {
  id: number; employeeNumber: string | null; name: string; knownAs: string | null
  idNumber: string | null; department: string | null; jobTitle: string | null
  rateMonth: string; active: boolean; notes: string | null
}

const emptyForm = {
  employeeNumber: '', name: '', knownAs: '', idNumber: '',
  department: '', jobTitle: '', paypoint: '', rateMonth: '',
  bankName: '', bankAccount: '', branchCode: '',
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(setEmployees)
      .finally(() => setLoading(false))
  }, [])

  async function refetchEmployees() {
    const res = await fetch('/api/employees')
    setEmployees(await res.json())
  }

  async function createEmployee() {
    if (!form.name || !form.rateMonth) return
    setSaving(true)
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
    await refetchEmployees()
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/payroll" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1">
            <ArrowLeft size={12} /> Payroll
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> Add Employee
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            {([
              ['employeeNumber', 'Employee Number'], ['name', 'Full Name'], ['knownAs', 'Known As'],
              ['idNumber', 'ID Number'], ['department', 'Department'], ['jobTitle', 'Job Title'],
              ['paypoint', 'Paypoint'], ['rateMonth', 'Rate Per Month'],
              ['bankName', 'Bank Name'], ['bankAccount', 'Bank Account'], ['branchCode', 'Branch Code'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-gray-500">{label}</Label>
                <Input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={createEmployee} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">ID Number</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs text-right">Rate / Month</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-gray-400 text-xs">{e.employeeNumber ?? '—'}</TableCell>
                  <TableCell className="font-medium text-gray-900">{e.knownAs ?? e.name}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{e.idNumber ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{e.department ?? '—'}</TableCell>
                  <TableCell className="text-right text-gray-700">R {parseFloat(e.rateMonth).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
