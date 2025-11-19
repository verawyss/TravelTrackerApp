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
      <head>
        {/* Google Maps Script mit korrektem async loading */}
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=de&loading=async`}
          async
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
