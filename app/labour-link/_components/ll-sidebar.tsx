'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, GitBranch, Users, MessageSquare, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/labour-link',            label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { href: '/labour-link/pipeline',   label: 'Pipeline',   icon: GitBranch },
  { href: '/labour-link/clients',    label: 'Clients',    icon: Users },
  { href: '/labour-link/onboarding', label: 'Onboarding', icon: ClipboardList },
  { href: '/labour-link/tools',      label: 'Tools',      icon: MessageSquare },
]

export function LLSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-52 flex-col border-r border-[rgba(0,0,0,0.08)] bg-white">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[rgba(0,0,0,0.08)] px-5">
        <span className="font-[family-name:var(--font-syne)] text-[15px] font-extrabold tracking-tight text-gray-900">
          Labour<span className="text-[#3a6bef]">Link</span>
        </span>
        <span className="rounded-full border border-[rgba(0,0,0,0.12)] px-2 py-0.5 text-[9px] uppercase tracking-widest text-gray-400">
          CRM
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
                active
                  ? 'border border-[rgba(58,107,239,0.18)] bg-[rgba(58,107,239,0.08)] text-[#3a6bef]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-[rgba(0,0,0,0.08)] px-5 py-4">
        <UserButton />
        <span className="text-[11px] text-gray-400">Account</span>
      </div>
    </aside>
  )
}
