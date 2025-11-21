// app/api/admin/create-user/route.ts
// API Route zum Erstellen von Benutzern ohne E-Mail-Benachrichtigung

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Admin-Client mit Service Role Key (kann E-Mail-Bestätigung umgehen)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Braucht Service Role Key!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    // Validierung
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }

    // 1. Erstelle Auth-User mit Admin-Client (OHNE E-Mail-Bestätigung)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ← WICHTIG: E-Mail automatisch bestätigt!
      user_metadata: {
        name
      }
    })

    if (authError) {
      throw new Error(`Auth-Fehler: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Benutzer konnte nicht erstellt werden')
    }

    // 2. Erstelle Eintrag in users-Tabelle
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: 'user' // Standard-Rolle
      })

    if (dbError) {
      // Rollback: Lösche Auth-User wenn DB-Insert fehlschlägt
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Datenbank-Fehler: ${dbError.message}`)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name
      },
      message: `Benutzer erfolgreich erstellt! Temporäres Passwort: ${password}`
    })

  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}
