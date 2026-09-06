'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Plus, Pencil } from 'lucide-react'

type Employee = {
  id: number; employeeNumber: string | null; name: string; knownAs: string | null
  idNumber: string | null; department: string | null; jobTitle: string | null
  paypoint: string | null; dateEngaged: string | null; rateMonth: string
  bankName: string | null; bankAccount: string | null; branchCode: string | null
  active: boolean; notes: string | null
}

const FIELDS = [
  ['employeeNumber', 'Employee Number'], ['name', 'Full Name'], ['knownAs', 'Known As'],
  ['idNumber', 'ID Number'], ['department', 'Department'], ['jobTitle', 'Job Title'],
  ['paypoint', 'Paypoint'], ['dateEngaged', 'Employment Start Date'], ['rateMonth', 'Rate Per Month'],
  ['bankName', 'Bank Name'], ['bankAccount', 'Bank Account'], ['branchCode', 'Branch Code'],
] as const

type FormState = Record<(typeof FIELDS)[number][0], string>

const emptyForm: FormState = {
  employeeNumber: '', name: '', knownAs: '', idNumber: '',
  department: '', jobTitle: '', paypoint: '', dateEngaged: '', rateMonth: '',
  bankName: '', bankAccount: '', branchCode: '',
}

function toForm(e: Employee): FormState {
  return {
    employeeNumber: e.employeeNumber ?? '', name: e.name, knownAs: e.knownAs ?? '',
    idNumber: e.idNumber ?? '', department: e.department ?? '', jobTitle: e.jobTitle ?? '',
    paypoint: e.paypoint ?? '', dateEngaged: e.dateEngaged ?? '', rateMonth: e.rateMonth,
    bankName: e.bankName ?? '', bankAccount: e.bankAccount ?? '', branchCode: e.branchCode ?? '',
  }
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadEmployees() {
    setListError('')
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed to load employees (${res.status})`)
      if (!Array.isArray(data)) throw new Error('Unexpected response loading employees')
      setEmployees(data)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEmployees() }, [])

  function openAddForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(e: Employee) {
    setEditingId(e.id)
    setForm(toForm(e))
    setFormError('')
    setShowForm(true)
  }

  async function saveEmployee() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Full Name is required'); return }
    if (!form.rateMonth.trim() || isNaN(parseFloat(form.rateMonth))) { setFormError('Rate Per Month is required and must be a number'); return }

    setSaving(true)
    try {
      const url = editingId ? `/api/employees/${editingId}` : '/api/employees'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed to save (${res.status})`)
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      await loadEmployees()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save employee')
    } finally {
      setSaving(false)
    }
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
        <Button size="sm" className="gap-2" onClick={openAddForm}>
          <Plus size={14} /> Add Employee
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-4">{editingId ? 'Edit Employee' : 'New Employee'}</p>
          <div className="grid grid-cols-3 gap-4">
            {FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-gray-500">{label}</Label>
                <Input
                  type={key === 'dateEngaged' ? 'date' : 'text'}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={saveEmployee} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : listError ? (
          <p className="p-8 text-center text-sm text-red-600">{listError}</p>
        ) : employees.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No employees yet — add one above.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">ID Number</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Start Date</TableHead>
                <TableHead className="text-xs text-right">Rate / Month</TableHead>
                <TableHead className="text-xs text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-gray-400 text-xs">{e.employeeNumber ?? '—'}</TableCell>
                  <TableCell className="font-medium text-gray-900">{e.knownAs ?? e.name}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{e.idNumber ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{e.department ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{e.dateEngaged ?? '—'}</TableCell>
                  <TableCell className="text-right text-gray-700">R {parseFloat(e.rateMonth).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon-sm" variant="ghost" onClick={() => openEditForm(e)} title="Edit">
                      <Pencil size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
