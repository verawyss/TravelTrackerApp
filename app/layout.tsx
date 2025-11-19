import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TravelTracker Pro',
  description: 'Deine Reiseplanungs-App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <head>
        {/* Google Maps Script */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=de`}
          async
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
