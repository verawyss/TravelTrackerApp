// app/api/auth/reset-password/route.ts
// API Route für Passwort-Zurücksetzen

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail ist erforderlich' },
        { status: 400 }
      )
    }

    // Prüfe ob Benutzer existiert
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    const existingUser = user?.users.find(u => u.email === email)
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      )
    }

    // Sende Passwort-Reset-E-Mail
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
    })

    if (resetError) {
      throw new Error(`Reset-Fehler: ${resetError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Passwort-Reset-E-Mail wurde gesendet'
    })

  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}
