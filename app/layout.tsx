import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TravelTracker Pro',
  description: 'Reiseplanung leicht gemacht',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
