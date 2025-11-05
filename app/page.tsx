'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TravelTrackerApp() {
  // ========== AUTH STATE ==========
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(true)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })

  const [currentUser, setCurrentUser] = useState<any>(null)

  // ========== ORIGINAL STATES ==========
  const [activeTab, setActiveTab] = useState('overview')
  const [expenses, setExpenses] = useState<any[]>([])
  const [itineraryItems, setItineraryItems] = useState<any[]>([])
  const [packingLists, setPackingLists] = useState<any[]>([])
  const [currentTrip, setCurrentTrip] = useState<any>(null)
  const [settlements, setSettlements] = useState<any[]>([])

  // ========== V2 FEATURES - NEUE STATES ==========
  const [allUserTrips, setAllUserTrips] = useState<any[]>([])
  const [tripMembers, setTripMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('owner')

  // Modal States
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showAddActivityModal, setShowAddActivityModal] = useState(false)

  // Admin User Management States
  const [users, setUsers] = useState<any[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [loadingUserAction, setLoadingUserAction] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: ''
  })

  // Form States
  const [newTripData, setNewTripData] = useState({
    name: '',
    destination: '',
    flag: '🌍',
    start_date: '',
    end_date: '',
    budget: 0,
    currency: 'EUR'
  })

  const [inviteEmail, setInviteEmail] = useState('')

  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    type: 'activity' as 'hotel' | 'restaurant' | 'activity' | 'transport' | 'other',
    notes: ''
  })

  const [newExpense, setNewExpense] = useState({
    category: 'Sonstiges',
    description: '',
    amount: 0,
    paid_by: '',
    split_between: [] as string[]
  })

  const [newActivity, setNewActivity] = useState({
    day: 1,
    time: '10:00',
    title: '',
    details: '',
    type: 'Aktivität'
  })

  // ========== AUTH FUNCTIONS ==========
  
  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          setCurrentUser(userData)
          setIsAuthenticated(true)
          loadInitialData()
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingUserAction(true)
    setAuthMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) throw error

      // Lade User-Daten
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      setCurrentUser(userData)
      setIsAuthenticated(true)
      setAuthMessage({ type: 'success', text: '✅ Erfolgreich eingeloggt!' })
      
      // Daten laden
      setTimeout(() => {
        loadInitialData()
      }, 500)

    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ Fehler: ${error.message}` })
    } finally {
      setLoadingUserAction(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setCurrentUser(null)
    setCredentials({ email: '', password: '' })
  }

  // Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingUserAction(true)
    setAuthMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(credentials.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      setAuthMessage({ 
        type: 'success', 
        text: '✅ Passwort-Reset-Link wurde an deine E-Mail gesendet!' 
      })

    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ Fehler: ${error.message}` })
    } finally {
      setLoadingUserAction(false)
    }
  }

  // ========== LOAD DATA ==========
  const loadInitialData = async () => {
    if (!currentUser) return
    
    await loadAllTrips()
    if (currentUser.role === 'admin') {
      await loadUsers()
    }
  }

  const loadAllTrips = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, trip_members(*)')
        .or(`created_by.eq.${currentUser.id},trip_members.user_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        setAllUserTrips(data)
        if (!currentTrip) {
          setCurrentTrip(data[0])
          await loadTripData(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading trips:', error)
    }
  }

  const loadTripData = async (tripId: string) => {
    try {
      const [expensesRes, itineraryRes, packingRes, membersRes, locationsRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('trip_id', tripId),
        supabase.from('itinerary').select('*').eq('trip_id', tripId).order('day', { ascending: true }),
        supabase.from('packing_list').select('*').eq('trip_id', tripId),
        supabase.from('trip_members').select('*, user:users(*)').eq('trip_id', tripId),
        supabase.from('locations').select('*').eq('trip_id', tripId)
      ])

      if (expensesRes.data) setExpenses(expensesRes.data)
      if (itineraryRes.data) setItineraryItems(itineraryRes.data)
      if (packingRes.data) setPackingLists(packingRes.data)
      if (membersRes.data) setTripMembers(membersRes.data)
      if (locationsRes.data) setLocations(locationsRes.data)

      calculateSettlements()
    } catch (error) {
      console.error('Error loading trip data:', error)
    }
  }

  const calculateSettlements = () => {
    // Deine bestehende Settlement-Logik hier
    setSettlements([])
  }

  // ========== ADMIN USER MANAGEMENT ==========
  
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error)
    }
  }

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      alert('❌ Bitte alle Felder ausfüllen!')
      return
    }

    if (newUser.password.length < 6) {
      alert('❌ Passwort muss mindestens 6 Zeichen lang sein!')
      return
    }

    setLoadingUserAction(true)

    try {
      // Verwende die API Route für Admin-User-Erstellung
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      alert('✅ Benutzer erfolgreich erstellt!')
      setShowAddUserModal(false)
      setNewUser({ email: '', password: '', name: '' })
      loadUsers()

    } catch (error: any) {
      alert(`❌ Fehler: ${error.message}`)
    } finally {
      setLoadingUserAction(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Möchtest du diesen Benutzer wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      alert('✅ Benutzer gelöscht!')
      loadUsers()

    } catch (error: any) {
      alert(`❌ Fehler: ${error.message}`)
    }
  }

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      alert(`✅ Passwort-Reset-Link wurde an ${email} gesendet!`)

    } catch (error: any) {
      alert(`❌ Fehler: ${error.message}`)
    }
  }

  // ========== RENDER LOGIN PAGE ==========
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✈️</div>
          <p className="text-gray-600">Lade...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✈️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">TravelTracker Pro</h1>
            <p className="text-gray-600">
              {showPasswordReset ? 'Passwort zurücksetzen' : 'Melde dich an'}
            </p>
          </div>

          {/* Message Display */}
          {authMessage && (
            <div className={`mb-6 p-4 rounded-lg ${
              authMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {authMessage.text}
            </div>
          )}

          {/* Login or Password Reset Form */}
          {!showPasswordReset ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input 
                  type="email"
                  required
                  placeholder="deine@email.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <button 
                type="submit"
                disabled={loadingUserAction}
                className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingUserAction ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input 
                  type="email"
                  required
                  placeholder="deine@email.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Du erhältst einen Link per E-Mail, um dein Passwort zurückzusetzen.
                </p>
              </div>

              <button 
                type="submit"
                disabled={loadingUserAction}
                className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingUserAction ? 'Wird gesendet...' : 'Reset-Link senden'}
              </button>
            </form>
          )}

          {/* Toggle zwischen Login und Password Reset */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowPasswordReset(!showPasswordReset)
                setAuthMessage(null)
              }}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              {showPasswordReset ? '← Zurück zum Login' : '🔑 Passwort vergessen?'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Noch kein Account? Kontaktiere deinen Admin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ========== RENDER ADMIN USER MANAGEMENT ==========
  
  const renderAdminUserManagement = () => {
    if (currentUser?.role !== 'admin') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">⚠️ Nur Admins können Benutzer verwalten.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">👥 Benutzerverwaltung</h2>
            <p className="text-gray-600 mt-1">Verwalte deine Freunde und deren Zugänge</p>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Neuen Benutzer hinzufügen</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">E-Mail</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rolle</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Erstellt</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-lg">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role || 'member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => sendPasswordReset(user.email)}
                        className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        🔑 PW zurücksetzen
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                        >
                          🗑️ Löschen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Noch keine Benutzer vorhanden. Erstelle den ersten Benutzer!
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Hinweise zur Benutzerverwaltung</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Neuer Benutzer:</strong> Erstelle einen Account mit E-Mail und Passwort</li>
            <li>• <strong>Login:</strong> Deine Freunde können sich mit ihrer E-Mail und dem Passwort einloggen</li>
            <li>• <strong>Passwort zurücksetzen:</strong> Sendet einen Reset-Link an die E-Mail-Adresse</li>
            <li>• <strong>Mindestanforderung:</strong> Passwort muss mindestens 6 Zeichen lang sein</li>
          </ul>
        </div>
      </div>
    )
  }

  // ========== RENDER ADMIN TAB ==========
  
  const renderAdmin = () => {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-4">⚙️ Admin-Bereich</h2>
          <p className="text-gray-600 mb-4">
            Verwaltung und Einstellungen für TravelTracker Pro
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full">
              Eingeloggt als: {currentUser?.name}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              Rolle: {currentUser?.role || 'member'}
            </span>
          </div>
        </div>

        {/* User Management */}
        {renderAdminUserManagement()}

        {/* System Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold mb-4">🗄️ System-Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{allUserTrips.length}</div>
              <div className="text-gray-600">Reisen</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{expenses.length}</div>
              <div className="text-gray-600">Ausgaben</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{users.length}</div>
              <div className="text-gray-600">Benutzer</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{tripMembers.length}</div>
              <div className="text-gray-600">Team-Mitglieder</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Platzhalter für andere Tabs (verwende deine bestehenden Funktionen)
  const renderOverview = () => <div className="bg-white rounded-xl p-6">Overview Tab - Füge hier deine bestehende Logik ein</div>
  const renderTripsManagement = () => <div className="bg-white rounded-xl p-6">Trips Tab - Füge hier deine bestehende Logik ein</div>
  const renderExpenses = () => <div className="bg-white rounded-xl p-6">Expenses Tab - Füge hier deine bestehende Logik ein</div>
  const renderItinerary = () => <div className="bg-white rounded-xl p-6">Itinerary Tab - Füge hier deine bestehende Logik ein</div>
  const renderPacking = () => <div className="bg-white rounded-xl p-6">Packing Tab - Füge hier deine bestehende Logik ein</div>
  const renderMapView = () => <div className="bg-white rounded-xl p-6">Map Tab - Füge hier deine bestehende Logik ein</div>
  const renderFriendsAndInvitations = () => <div className="bg-white rounded-xl p-6">Friends Tab - Füge hier deine bestehende Logik ein</div>
  const renderSettlement = () => <div className="bg-white rounded-xl p-6">Settlement Tab - Füge hier deine bestehende Logik ein</div>

  function renderTabContent() {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'trips': return renderTripsManagement()
      case 'expenses': return renderExpenses()
      case 'itinerary': return renderItinerary()
      case 'packing': return renderPacking()
      case 'map': return renderMapView()
      case 'friends': return renderFriendsAndInvitations()
      case 'settlement': return renderSettlement()
      case 'admin': return renderAdmin()
      default: return null
    }
  }

  // ========== MODALS ==========

  const renderAddUserModal = () => {
    if (!showAddUserModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">➕ Neuen Benutzer hinzufügen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input 
                type="text"
                placeholder="z.B. Max Mustermann"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input 
                type="email"
                placeholder="max@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort * (mind. 6 Zeichen)
              </label>
              <input 
                type="password"
                placeholder="••••••••"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                💡 Der Benutzer erhält seine Login-Daten und kann sich sofort anmelden.
                Über "PW zurücksetzen" kann er später ein neues Passwort setzen.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowAddUserModal(false)
                setNewUser({ email: '', password: '', name: '' })
              }}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loadingUserAction}
            >
              Abbrechen
            </button>
            <button 
              onClick={createUser}
              disabled={loadingUserAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingUserAction ? 'Wird erstellt...' : 'Benutzer erstellen'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== MAIN RENDER ==========
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✈️</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TravelTracker Pro</h1>
                <p className="text-sm text-gray-600">v2.0 - Mit Auth System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {currentTrip && (
                <div className="hidden md:flex items-center gap-3 bg-teal-50 px-4 py-2 rounded-lg">
                  <span className="text-2xl">{currentTrip.flag}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{currentTrip.name}</div>
                    <div className="text-sm text-gray-600">{currentTrip.destination}</div>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                🚪 Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide">
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
                className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Modals */}
      {renderAddUserModal()}
    </div>
  )
}
