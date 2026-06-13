import type { Metadata } from 'next'
import { Syne, DM_Mono } from 'next/font/google'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LLSidebar } from './_components/ll-sidebar'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Labour Link CRM',
  description: 'Sales & client management for Labour Link',
}

export default async function LLLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className={`${syne.variable} ${dmMono.variable} flex h-screen overflow-hidden bg-[#f0f2f5]`}>
      <LLSidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
