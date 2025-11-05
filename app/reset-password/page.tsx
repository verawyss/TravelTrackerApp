'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage({ 
          type: 'error', 
          text: '❌ Ungültiger oder abgelaufener Reset-Link. Bitte fordere einen neuen an.' 
        })
      }
    }
    checkSession()
  }, [])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '❌ Passwort muss mindestens 6 Zeichen lang sein!' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '❌ Passwörter stimmen nicht überein!' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: '✅ Passwort erfolgreich geändert! Du wirst weitergeleitet...' 
      })

      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Fehler: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Neues Passwort setzen</h1>
          <p className="text-gray-600">
            Wähle ein neues, sicheres Passwort für deinen Account
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort
            </label>
            <input 
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Mindestens 6 Zeichen</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen
            </label>
            <input 
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              minLength={6}
            />
          </div>

          {newPassword && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">Passwort-Stärke:</p>
              <div className="space-y-1 text-xs">
                <div className={newPassword.length >= 6 ? 'text-green-700' : 'text-gray-500'}>
                  {newPassword.length >= 6 ? '✓' : '○'} Mindestens 6 Zeichen
                </div>
                <div className={/[A-Z]/.test(newPassword) ? 'text-green-700' : 'text-gray-500'}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '○'} Großbuchstabe (empfohlen)
                </div>
                <div className={/[0-9]/.test(newPassword) ? 'text-green-700' : 'text-gray-500'}>
                  {/[0-9]/.test(newPassword) ? '✓' : '○'} Zahl (empfohlen)
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Passwort wird geändert...' : 'Passwort ändern'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            ← Zurück zur Startseite
          </button>
        </div>
      </div>
    </div>
  )
}
