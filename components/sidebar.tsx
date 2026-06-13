'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { FileText, Settings, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard/statements',    label: 'Statements',    icon: FileText },
  { href: '/dashboard/road-invoicing', label: 'Road Invoicing', icon: Truck    },
  { href: '/dashboard/settings',      label: 'Settings',      icon: Settings  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100">
        <span className="text-[15px] font-semibold tracking-tight text-gray-900">
          Izmaan Ecosystem
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
        <UserButton />
        <span className="text-xs text-gray-500">Account</span>
      </div>
    </aside>
  )
}
