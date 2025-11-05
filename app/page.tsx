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

  // ========== AUTH FUNCTIONS - FIXED ==========
  
  // ✅ FIX: Auth State Listener statt checkAuth
  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserData(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Auth State Listener - reagiert auf Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session) {
          await loadUserData(session.user.id)
          setIsAuthenticated(true)
          setIsLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setIsAuthenticated(false)
          setAllUserTrips([])
          setCurrentTrip(null)
          setIsLoading(false)
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ✅ NEU: Separate Funktion zum Laden der User-Daten
  const loadUserData = async (userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error loading user data:', error)
        throw error
      }

      if (userData) {
        setCurrentUser(userData)
        setIsAuthenticated(true)
        // Lade Trips und andere Daten
        await loadInitialData(userData)
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      setAuthMessage({ 
        type: 'error', 
        text: '❌ Fehler beim Laden der Benutzerdaten. Bitte melde dich erneut an.' 
      })
    }
  }

  // ✅ FIX: Einfacherer Login ohne direktes User-Laden
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

      // ✅ Der Auth State Listener übernimmt jetzt das Laden der User-Daten
      setAuthMessage({ type: 'success', text: '✅ Erfolgreich eingeloggt!' })

    } catch (error: any) {
      console.error('Login error:', error)
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
    setAuthMessage(null)
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
  const loadInitialData = async (user?: any) => {
    const userData = user || currentUser
    if (!userData) return
    
    await loadAllTrips(userData)
    if (userData.role === 'admin') {
      await loadUsers()
    }
  }

  const loadAllTrips = async (user?: any) => {
    const userData = user || currentUser
    if (!userData) return

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, trip_members(*)')
        .or(`created_by.eq.${userData.id},trip_members.user_id.eq.${userData.id}`)
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
      // Lade Expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false })

      if (expensesData) setExpenses(expensesData)

      // Lade Itinerary
      const { data: itineraryData } = await supabase
        .from('itinerary')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })

      if (itineraryData) setItineraryItems(itineraryData)

      // Lade Packing List
      const { data: packingData } = await supabase
        .from('packing_list')
        .select('*')
        .eq('trip_id', tripId)
        .order('category', { ascending: true })

      if (packingData) setPackingLists(packingData)

      // Lade Trip Members
      const { data: membersData } = await supabase
        .from('trip_members')
        .select('*, users(*)')
        .eq('trip_id', tripId)

      if (membersData) setTripMembers(membersData)

      // Lade Locations
      const { data: locationsData } = await supabase
        .from('locations')
        .select('*')
        .eq('trip_id', tripId)

      if (locationsData) setLocations(locationsData)

    } catch (error) {
      console.error('Error loading trip data:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // ========== USER MANAGEMENT (Admin only) ==========

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      setAuthMessage({ type: 'error', text: '❌ Bitte fülle alle Felder aus!' })
      return
    }

    if (newUser.password.length < 6) {
      setAuthMessage({ type: 'error', text: '❌ Passwort muss mindestens 6 Zeichen haben!' })
      return
    }

    setLoadingUserAction(true)
    setAuthMessage(null)

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Erstellen des Benutzers')
      }

      setAuthMessage({ 
        type: 'success', 
        text: '✅ Benutzer erfolgreich erstellt!' 
      })

      setShowAddUserModal(false)
      setNewUser({ email: '', password: '', name: '' })
      await loadUsers()

    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingUserAction(false)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Benutzer "${userEmail}" wirklich löschen?`)) return

    setLoadingUserAction(true)

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Löschen')
      }

      setAuthMessage({ type: 'success', text: '✅ Benutzer gelöscht!' })
      await loadUsers()

    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingUserAction(false)
    }
  }

  const sendPasswordResetToUser = async (email: string) => {
    setLoadingUserAction(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      setAuthMessage({ 
        type: 'success', 
        text: `✅ Passwort-Reset-Link an ${email} gesendet!` 
      })

    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingUserAction(false)
    }
  }

  // ========== RENDER FUNCTIONS ==========

  // Login Screen
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
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-teal-500 rounded-2xl mb-4">
              <span className="text-4xl">✈️</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">TravelTracker Pro</h1>
            <p className="text-gray-600">
              {showPasswordReset ? 'Passwort zurücksetzen' : 'Melde dich an'}
            </p>
          </div>

          {/* Alert Messages */}
          {authMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              authMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {authMessage.text}
            </div>
          )}

          {/* Login Form */}
          {showLogin && !showPasswordReset && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="deine@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
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
          )}

          {/* Password Reset Form */}
          {showPasswordReset && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="deine@email.com"
                  required
                />
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

          {/* Toggle Password Reset */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowPasswordReset(!showPasswordReset)
                setAuthMessage(null)
              }}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              {showPasswordReset ? '🔐 Zurück zum Login' : '🔑 Passwort vergessen?'}
            </button>
          </div>

          {/* Admin Contact */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            Noch kein Account? Kontaktiere deinen Admin.
          </div>
        </div>
      </div>
    )
  }

  // ========== ADMIN TAB ==========
  const renderAdminUserManagement = () => {
    if (currentUser?.role !== 'admin') return null

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">👥 Benutzerverwaltung</h3>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            ➕ Benutzer hinzufügen
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">E-Mail</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rolle</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Erstellt</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendPasswordResetToUser(user.email)}
                        className="text-teal-600 hover:text-teal-700 text-sm"
                        disabled={loadingUserAction}
                      >
                        🔑 PW Reset
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-700 text-sm"
                          disabled={loadingUserAction}
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
        </div>
      </div>
    )
  }

  const renderAdmin = () => {
    if (currentUser?.role !== 'admin') {
      return (
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-bold mb-2">Zugriff verweigert</h3>
          <p className="text-gray-600">Nur Admins können diese Seite sehen.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold mb-4">👤 Dein Account</h3>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              {currentUser?.email}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
              {currentUser?.name}
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

      {/* Alert Messages - Sticky */}
      {authMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className={`p-4 rounded-lg border ${
            authMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span>{authMessage.text}</span>
              <button 
                onClick={() => setAuthMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Modals */}
      {renderAddUserModal()}
    </div>
  )
}
