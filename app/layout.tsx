import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TravelTracker Pro',
  description: 'Deine ultimative Reiseplanungs-App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <html lang="de">
      <head>
        {/* Google Places Autocomplete Script */}
        {googleMapsApiKey && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&language=de`}
            async
            defer
          />
        )}
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
