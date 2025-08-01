import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarım Makine Kataloğu',
  description: 'Tarım makineleri kataloğu web uygulaması',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}