import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password, name } = await request.json()

  // Admin Supabase Client mit Service Role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 1. User in Auth erstellen
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError) throw authError

    // 2. User in Datenbank einfügen
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name
    })

    if (dbError) throw dbError

    return NextResponse.json({ success: true, user: authData.user })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
