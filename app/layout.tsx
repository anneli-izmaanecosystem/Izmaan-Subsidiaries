import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Izmaan Ecosystem',
  description: 'Business intelligence & client management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} h-full`}>
        <body className="h-full bg-gray-50 font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
