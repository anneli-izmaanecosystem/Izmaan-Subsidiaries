'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Link2 } from 'lucide-react'

function SettingsContent() {
  const params    = useSearchParams()
  const connected = params.get('connected') === 'true'
  const error     = params.get('error')

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your integrations.</p>
      </div>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Link2 size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">QuickBooks Online</p>
            <p className="text-xs text-gray-400">Connect your QBO account to pull live data</p>
          </div>
        </div>

        {connected && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle size={14} />
            Successfully connected to QuickBooks Online
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} />
            {error === 'invalid_state'   ? 'Connection failed: request may have expired. Please try again.' :
             error === 'invalid_request' ? 'Connection failed: invalid request.' :
             error === 'connection_failed' ? 'Could not connect to QuickBooks. Please try again.' :
             'An error occurred. Please try again.'}
          </div>
        )}

        <Button
          render={<a href="/api/qbo/connect" />}
          variant={connected ? 'outline' : 'default'}
          size="sm"
        >
          {connected ? 'Reconnect QuickBooks' : 'Connect QuickBooks'}
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
