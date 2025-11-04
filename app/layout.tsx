import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TravelTracker Pro - Deine Reise-Management-App',
  description: 'Verwalte deine Reisen, Ausgaben, Packlisten und mehr!',
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
