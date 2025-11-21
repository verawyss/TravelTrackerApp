// app/api/admin/create-user/route.ts
// Updated version with role support

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
    const { email, password, name, role } = await request.json()

    // Validierung
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    // Rolle validieren (falls übergeben)
    const validRoles = ['admin', 'member', 'user']
    const userRole = role && validRoles.includes(role) ? role : 'member'

    // 1. Erstelle Auth-User OHNE E-Mail-Bestätigung
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // E-Mail automatisch bestätigt!
      user_metadata: {
        name,
        role: userRole
      }
    })

    if (authError) {
      throw new Error(`Auth-Fehler: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Benutzer konnte nicht erstellt werden')
    }

    // 2. Erstelle Eintrag in users-Tabelle mit Rolle
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: userRole // Übergebe die gewählte Rolle
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
        name,
        role: userRole
      },
      message: `Benutzer erfolgreich erstellt als ${userRole === 'admin' ? 'Admin' : 'Member'}`
    })

  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}
