'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TravelTrackerApp() {
  // ========== AUTH & USER STATE ==========
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)

  // ========== APP STATE ==========
  const [activeTab, setActiveTab] = useState('trips')
  const [allUserTrips, setAllUserTrips] = useState<any[]>([])
  const [currentTrip, setCurrentTrip] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  // ========== TRIPS STATE ==========
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [showEditTripModal, setShowEditTripModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<any>(null)
  const [newTripData, setNewTripData] = useState({
    name: '',
    destination: '',
    flag: '🌍',
    start_date: '',
    end_date: '',
    currency: 'EUR',
    status: 'active'
  })

  const popularFlags = [
    '🌍', '✈️', '🏖️', '🏔️', '🏝️', '🎒', '🚗', '🚢', '🏕️', '🗼',
    '🇩🇪', '🇨🇭', '🇦🇹', '🇮🇹', '🇫🇷', '🇪🇸', '🇬🇷', '🇵🇹', '🇳🇱', '🇧🇪',
    '🇬🇧', '🇺🇸', '🇨🇦', '🇲🇽', '🇧🇷', '🇦🇷', '🇯🇵', '🇹🇭', '🇦🇺', '🇳🇿'
  ]

  // ========== ADMIN STATE ==========
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '' })

  // ========== AUTH ==========
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadUserData(session.user.id)
      else setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await loadUserData(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setIsAuthenticated(false)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (userId: string, retryCount = 0): Promise<void> => {
    try {
      if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 200))

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (retryCount < 3 && error.message.includes('policy')) {
          await new Promise(resolve => setTimeout(resolve, 500))
          return loadUserData(userId, retryCount + 1)
        }
        throw error
      }

      if (userData) {
        setCurrentUser(userData)
        setIsAuthenticated(true)
        await loadAllTrips(userData)
        if (userData.role === 'admin') await loadUsers()
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      setAuthMessage({ type: 'error', text: '❌ Fehler beim Laden' })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingAction(true)
    setAuthMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      setAuthMessage({ type: 'success', text: '✅ Erfolgreich eingeloggt!' })
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingAction(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(credentials.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setAuthMessage({ type: 'success', text: '✅ Reset-Link gesendet!' })
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  // ========== TRIPS FUNCTIONS ==========
  const loadAllTrips = async (user?: any) => {
    const userData = user || currentUser
    if (!userData) return

    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members(count)
        `)
        .or(`created_by.eq.${userData.id},id.in.(select trip_id from trip_members where user_id=${userData.id})`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllUserTrips(data || [])
      if (data && data.length > 0 && !currentTrip) {
        setCurrentTrip(data[0])
      }
    } catch (error) {
      console.error('Error loading trips:', error)
    }
  }

  const createTrip = async () => {
    if (!newTripData.name || !newTripData.destination) {
      setAuthMessage({ type: 'error', text: '❌ Name und Ziel sind Pflichtfelder!' })
      return
    }

    setLoadingAction(true)
    try {
      // 1. Trip erstellen (OHNE is_public und budget)
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: newTripData.name,
          destination: newTripData.destination,
          flag: newTripData.flag,
          start_date: newTripData.start_date || null,
          end_date: newTripData.end_date || null,
          currency: newTripData.currency,
          status: newTripData.status,
          created_by: currentUser.id
        })
        .select()
        .single()

      if (tripError) throw tripError

      // 2. User als Owner hinzufügen
      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripData.id,
          user_id: currentUser.id,
          role: 'owner'
        })

      if (memberError) throw memberError

      setAuthMessage({ type: 'success', text: '✅ Reise erstellt!' })
      setShowNewTripModal(false)
      setNewTripData({
        name: '',
        destination: '',
        flag: '🌍',
        start_date: '',
        end_date: '',
        currency: 'EUR',
        status: 'active'
      })
      await loadAllTrips()
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const updateTrip = async () => {
    if (!editingTrip) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          name: editingTrip.name,
          destination: editingTrip.destination,
          flag: editingTrip.flag,
          start_date: editingTrip.start_date,
          end_date: editingTrip.end_date,
          currency: editingTrip.currency,
          status: editingTrip.status
        })
        .eq('id', editingTrip.id)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Reise aktualisiert!' })
      setShowEditTripModal(false)
      setEditingTrip(null)
      await loadAllTrips()
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const deleteTrip = async (tripId: string, tripName: string) => {
    if (!confirm(`Reise "${tripName}" wirklich löschen? Dies kann nicht rückgängig gemacht werden!`)) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Reise gelöscht!' })
      if (currentTrip?.id === tripId) setCurrentTrip(null)
      await loadAllTrips()
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  // ========== ADMIN FUNCTIONS ==========
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      setAuthMessage({ type: 'error', text: '❌ Alle Felder ausfüllen!' })
      return
    }

    setLoadingAction(true)
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      setAuthMessage({ type: 'success', text: '✅ Benutzer erstellt!' })
      setShowAddUserModal(false)
      setNewUser({ email: '', password: '', name: '' })
      await loadUsers()
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  // ========== RENDER TABS ==========
  const renderTripsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meine Reisen</h2>
          <p className="text-gray-600">Verwalte deine Trips</p>
        </div>
        <button
          onClick={() => setShowNewTripModal(true)}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <span className="text-xl">➕</span>
          <span>Neue Reise</span>
        </button>
      </div>

      {allUserTrips.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Noch keine Reisen</h3>
          <p className="text-gray-600 mb-6">Erstelle deine erste Reise und beginne zu planen!</p>
          <button
            onClick={() => setShowNewTripModal(true)}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
          >
            <span>➕</span>
            <span>Erste Reise erstellen</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allUserTrips.map((trip) => (
            <div
              key={trip.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-lg ${
                currentTrip?.id === trip.id ? 'border-teal-500' : 'border-gray-200'
              }`}
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{trip.flag}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{trip.name}</h3>
                      <p className="text-gray-600">{trip.destination}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    trip.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {trip.status === 'active' ? 'Aktiv' : 'Archiviert'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-3">
                {trip.start_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>📅</span>
                    <span>
                      {new Date(trip.start_date).toLocaleDateString('de-DE')}
                      {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString('de-DE')}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>👥</span>
                  <span>{trip.trip_members?.[0]?.count || 1} Mitglied(er)</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-b-xl flex gap-2">
                <button
                  onClick={() => setCurrentTrip(trip)}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  Auswählen
                </button>
                <button
                  onClick={() => {
                    setEditingTrip(trip)
                    setShowEditTripModal(true)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteTrip(trip.id, trip.name)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  disabled={loadingAction}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderOverview = () => (
    <div className="bg-white rounded-xl p-12 text-center">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-2xl font-bold mb-2">Übersicht</h3>
      <p className="text-gray-600">Dashboard kommt bald...</p>
    </div>
  )

  const renderAdminTab = () => {
    if (currentUser?.role !== 'admin') {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-bold mb-2">Zugriff verweigert</h3>
          <p className="text-gray-600">Nur Admins können diese Seite sehen.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">👥 Benutzerverwaltung</h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
            >
              ➕ Benutzer hinzufügen
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">E-Mail</th>
                  <th className="text-left py-3 px-4">Rolle</th>
                  <th className="text-left py-3 px-4">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderPlaceholder = (title: string, icon: string) => (
    <div className="bg-white rounded-xl p-12 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">Kommt bald...</p>
    </div>
  )

  function renderTabContent() {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'trips': return renderTripsTab()
      case 'expenses': return renderPlaceholder('Ausgaben', '💰')
      case 'itinerary': return renderPlaceholder('Reiseplan', '🗓️')
      case 'packing': return renderPlaceholder('Packliste', '🎒')
      case 'map': return renderPlaceholder('Karte', '🗺️')
      case 'friends': return renderPlaceholder('Team', '👥')
      case 'settlement': return renderPlaceholder('Abrechnung', '💳')
      case 'admin': return renderAdminTab()
      default: return null
    }
  }

  // ========== MODALS ==========
  const renderNewTripModal = () => {
    if (!showNewTripModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-8 max-w-2xl w-full my-8">
          <h2 className="text-2xl font-bold mb-6">✈️ Neue Reise erstellen</h2>
          
          <div className="space-y-4">
            {/* Name & Ziel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Reisename *</label>
                <input 
                  type="text"
                  placeholder="z.B. Sommerurlaub Italien"
                  value={newTripData.name}
                  onChange={(e) => setNewTripData({...newTripData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ziel *</label>
                <input 
                  type="text"
                  placeholder="z.B. Rom, Italien"
                  value={newTripData.destination}
                  onChange={(e) => setNewTripData({...newTripData, destination: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Flaggen-Auswahl */}
            <div>
              <label className="block text-sm font-medium mb-2">Flagge / Symbol wählen</label>
              <div className="grid grid-cols-10 gap-2 p-4 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                {popularFlags.map((flag) => (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => setNewTripData({...newTripData, flag})}
                    className={`text-3xl p-2 rounded-lg hover:bg-white transition-colors ${
                      newTripData.flag === flag ? 'bg-teal-100 ring-2 ring-teal-500' : 'bg-white'
                    }`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-center">
                <span className="text-4xl">{newTripData.flag}</span>
                <p className="text-xs text-gray-500 mt-1">Ausgewählt</p>
              </div>
            </div>

            {/* Datum */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Startdatum</label>
                <input 
                  type="date"
                  value={newTripData.start_date}
                  onChange={(e) => setNewTripData({...newTripData, start_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Enddatum</label>
                <input 
                  type="date"
                  value={newTripData.end_date}
                  onChange={(e) => setNewTripData({...newTripData, end_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Währung */}
            <div>
              <label className="block text-sm font-medium mb-2">Währung</label>
              <select
                value={newTripData.currency}
                onChange={(e) => setNewTripData({...newTripData, currency: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CHF">CHF (Fr.)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowNewTripModal(false)
                setNewTripData({
                  name: '',
                  destination: '',
                  flag: '🌍',
                  start_date: '',
                  end_date: '',
                  currency: 'EUR',
                  status: 'active'
                })
              }}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
              disabled={loadingAction}
            >
              Abbrechen
            </button>
            <button 
              onClick={createTrip}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {loadingAction ? 'Erstelle...' : '✈️ Reise erstellen'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderEditTripModal = () => {
    if (!showEditTripModal || !editingTrip) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-8 max-w-2xl w-full my-8">
          <h2 className="text-2xl font-bold mb-6">✏️ Reise bearbeiten</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Reisename</label>
                <input 
                  type="text"
                  value={editingTrip.name}
                  onChange={(e) => setEditingTrip({...editingTrip, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ziel</label>
                <input 
                  type="text"
                  value={editingTrip.destination}
                  onChange={(e) => setEditingTrip({...editingTrip, destination: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Flagge / Symbol</label>
              <div className="grid grid-cols-10 gap-2 p-4 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                {popularFlags.map((flag) => (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => setEditingTrip({...editingTrip, flag})}
                    className={`text-3xl p-2 rounded-lg hover:bg-white transition-colors ${
                      editingTrip.flag === flag ? 'bg-teal-100 ring-2 ring-teal-500' : 'bg-white'
                    }`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Startdatum</label>
                <input 
                  type="date"
                  value={editingTrip.start_date}
                  onChange={(e) => setEditingTrip({...editingTrip, start_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Enddatum</label>
                <input 
                  type="date"
                  value={editingTrip.end_date}
                  onChange={(e) => setEditingTrip({...editingTrip, end_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={editingTrip.status}
                onChange={(e) => setEditingTrip({...editingTrip, status: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="active">Aktiv</option>
                <option value="archived">Archiviert</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowEditTripModal(false)
                setEditingTrip(null)
              }}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={updateTrip}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Speichere...' : '💾 Speichern'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderAddUserModal = () => {
    if (!showAddUserModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">➕ Neuen Benutzer hinzufügen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input 
                type="text"
                placeholder="Max Mustermann"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">E-Mail *</label>
              <input 
                type="email"
                placeholder="max@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Passwort * (mind. 6 Zeichen)</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowAddUserModal(false)
                setNewUser({ email: '', password: '', name: '' })
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={createUser}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== MAIN RENDER ==========
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-teal-500 rounded-2xl mb-4">
              <span className="text-4xl">✈️</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">TravelTracker Pro</h1>
            <p className="text-gray-600">{showPasswordReset ? 'Passwort zurücksetzen' : 'Melde dich an'}</p>
          </div>

          {authMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              authMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {authMessage.text}
            </div>
          )}

          {!showPasswordReset ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">E-Mail</label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Passwort</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loadingAction}
                className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-medium"
              >
                {loadingAction ? 'Lädt...' : 'Anmelden'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">E-Mail</label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loadingAction}
                className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700"
              >
                {loadingAction ? 'Sendet...' : 'Reset-Link senden'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowPasswordReset(!showPasswordReset)
                setAuthMessage(null)
              }}
              className="text-teal-600 hover:text-teal-700 text-sm"
            >
              {showPasswordReset ? '🔐 Zurück zum Login' : '🔑 Passwort vergessen?'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✈️</span>
              <div>
                <h1 className="text-2xl font-bold">TravelTracker Pro</h1>
                {currentTrip && (
                  <p className="text-sm text-gray-600">
                    {currentTrip.flag} {currentTrip.name}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
            >
              🚪 Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', icon: '📊', label: 'Übersicht' },
              { id: 'trips', icon: '🌍', label: 'Reisen' },
              { id: 'expenses', icon: '💰', label: 'Ausgaben' },
              { id: 'itinerary', icon: '🗓️', label: 'Plan' },
              { id: 'packing', icon: '🎒', label: 'Packliste' },
              { id: 'map', icon: '🗺️', label: 'Karte' },
              { id: 'friends', icon: '👥', label: 'Team' },
              { id: 'settlement', icon: '💳', label: 'Abrechnung' },
              { id: 'admin', icon: '⚙️', label: 'Admin' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Alert Messages */}
      {authMessage && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            authMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <span>{authMessage.text}</span>
            <button onClick={() => setAuthMessage(null)} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderTabContent()}
      </main>

      {/* Modals */}
      {renderNewTripModal()}
      {renderEditTripModal()}
      {renderAddUserModal()}
    </div>
  )
}
