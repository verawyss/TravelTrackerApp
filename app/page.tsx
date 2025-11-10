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

  // ========== TEAM MANAGEMENT STATE ==========
  const [tripMembers, setTripMembers] = useState<any[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  // ========== EXPENSES STATE ==========
  const [expenses, setExpenses] = useState<any[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [expenseFilter, setExpenseFilter] = useState<string>('all')
  const [newExpense, setNewExpense] = useState({
    category: '🍕 Essen & Trinken',
    description: '',
    amount: '',
    paid_by: '',
    split_between: [] as string[],
    date: new Date().toISOString().split('T')[0]
  })

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
    if (!userData) {
      console.log('❌ loadAllTrips: No user data')
      return
    }

    console.log('🔍 Loading trips for user:', userData.id, userData.email)

    try {
      // Einfacher Query ohne OR - nur trips die der User erstellt hat
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('created_by', userData.id)
        .order('created_at', { ascending: false })

      console.log('📊 Trips query result:', { data, error })

      if (error) throw error
      
      // Zähle Members für jeden Trip separat
      if (data) {
        console.log(`✅ Found ${data.length} trips`)
        for (const trip of data) {
          const { count } = await supabase
            .from('trip_members')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', trip.id)
          
          trip.memberCount = count || 0
          console.log(`  Trip "${trip.name}" has ${trip.memberCount} members`)
        }
      } else {
        console.log('⚠️ No trips found')
      }
      
      setAllUserTrips(data || [])
      if (data && data.length > 0 && !currentTrip) {
        setCurrentTrip(data[0])
        console.log('🎯 Set current trip to:', data[0].name)
      }
    } catch (error) {
      console.error('❌ Error loading trips:', error)
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

  // ========== TEAM MANAGEMENT FUNCTIONS ==========
  const loadTripMembers = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('trip_id', tripId)
        .order('joined_at', { ascending: true })

      if (error) throw error
      setTripMembers(data || [])
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const loadPendingInvitations = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:users!invited_by(name)
        `)
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingInvitations(data || [])
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const inviteUserToTrip = async () => {
    if (!currentTrip || !inviteEmail) {
      setAuthMessage({ type: 'error', text: '❌ Bitte Email eingeben!' })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      setAuthMessage({ type: 'error', text: '❌ Ungültige Email-Adresse!' })
      return
    }

    setLoadingAction(true)
    try {
      // Check if user already member
      const { data: existingMember } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', currentTrip.id)
        .eq('user_id', (await supabase.from('users').select('id').eq('email', inviteEmail).single()).data?.id || '')
        .single()

      if (existingMember) {
        throw new Error('Benutzer ist bereits Mitglied dieser Reise!')
      }

      // Generate token
      const tokenArray = new Uint8Array(32)
      crypto.getRandomValues(tokenArray)
      const token = Array.from(tokenArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      // Create invitation
      const { error } = await supabase
        .from('invitations')
        .insert({
          trip_id: currentTrip.id,
          invited_by: currentUser.id,
          invited_email: inviteEmail,
          invited_user_id: existingUser?.id || null,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Einladung versendet!' })
      setShowInviteModal(false)
      setInviteEmail('')
      await loadPendingInvitations(currentTrip.id)

      // TODO: Send email notification
      console.log(`📧 Einladungs-Link: ${window.location.origin}/invite/${token}`)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const removeMember = async (memberId: string, userName: string) => {
    if (!confirm(`${userName} wirklich von der Reise entfernen?`)) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Mitglied entfernt!' })
      if (currentTrip) await loadTripMembers(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Rolle aktualisiert!' })
      if (currentTrip) await loadTripMembers(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Einladung wirklich zurückziehen?')) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Einladung zurückgezogen!' })
      if (currentTrip) await loadPendingInvitations(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  // Load members when trip changes
  useEffect(() => {
    if (currentTrip && activeTab === 'friends') {
      loadTripMembers(currentTrip.id)
      loadPendingInvitations(currentTrip.id)
    }
  }, [currentTrip, activeTab])

  // ========== EXPENSES FUNCTIONS ==========
  const expenseCategories = [
    { emoji: '🍕', label: 'Essen & Trinken' },
    { emoji: '🏨', label: 'Unterkunft' },
    { emoji: '🚗', label: 'Transport' },
    { emoji: '🎫', label: 'Aktivitäten' },
    { emoji: '🛍️', label: 'Shopping' },
    { emoji: '💊', label: 'Gesundheit' },
    { emoji: '📱', label: 'Sonstiges' }
  ]

  const loadExpenses = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          user:users!expenses_user_id_fkey(name, email),
          payer:users!expenses_paid_by_fkey(name, email)
        `)
        .eq('trip_id', tripId)
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const createExpense = async () => {
    if (!currentTrip || !newExpense.description || !newExpense.amount || !newExpense.paid_by) {
      setAuthMessage({ type: 'error', text: '❌ Bitte alle Pflichtfelder ausfüllen!' })
      return
    }

    if (newExpense.split_between.length === 0) {
      setAuthMessage({ type: 'error', text: '❌ Bitte mindestens eine Person zum Aufteilen auswählen!' })
      return
    }

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          trip_id: currentTrip.id,
          user_id: currentUser.id,
          category: newExpense.category,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          paid_by: newExpense.paid_by,
          split_between: newExpense.split_between,
          date: newExpense.date
        })

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Ausgabe hinzugefügt!' })
      setShowExpenseModal(false)
      resetExpenseForm()
      await loadExpenses(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const updateExpense = async () => {
    if (!editingExpense || !currentTrip) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          category: editingExpense.category,
          description: editingExpense.description,
          amount: parseFloat(editingExpense.amount),
          paid_by: editingExpense.paid_by,
          split_between: editingExpense.split_between,
          date: editingExpense.date
        })
        .eq('id', editingExpense.id)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Ausgabe aktualisiert!' })
      setShowExpenseModal(false)
      setEditingExpense(null)
      await loadExpenses(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const deleteExpense = async (expenseId: string, description: string) => {
    if (!confirm(`Ausgabe "${description}" wirklich löschen?`)) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Ausgabe gelöscht!' })
      if (currentTrip) await loadExpenses(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const resetExpenseForm = () => {
    setNewExpense({
      category: '🍕 Essen & Trinken',
      description: '',
      amount: '',
      paid_by: '',
      split_between: [],
      date: new Date().toISOString().split('T')[0]
    })
  }

  const toggleSplitPerson = (userId: string) => {
    setNewExpense(prev => {
      const isSelected = prev.split_between.includes(userId)
      return {
        ...prev,
        split_between: isSelected
          ? prev.split_between.filter(id => id !== userId)
          : [...prev.split_between, userId]
      }
    })
  }

  const selectAllForSplit = () => {
    setNewExpense(prev => ({
      ...prev,
      split_between: tripMembers.map(m => m.user_id)
    }))
  }

  // Load expenses when trip changes
  useEffect(() => {
    if (currentTrip && activeTab === 'expenses') {
      loadExpenses(currentTrip.id)
      if (tripMembers.length === 0) loadTripMembers(currentTrip.id)
    }
  }, [currentTrip, activeTab])

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
                  <span>{trip.memberCount || 1} Mitglied(er)</span>
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

  const renderExpensesTab = () => {
    if (!currentTrip) {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-2">Keine Reise ausgewählt</h3>
          <p className="text-gray-600">Wähle zuerst eine Reise aus.</p>
        </div>
      )
    }

    // Calculate statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
    const expensesByCategory = expenses.reduce((acc: any, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount)
      return acc
    }, {})

    // Filter expenses
    const filteredExpenses = expenseFilter === 'all' 
      ? expenses 
      : expenses.filter(exp => exp.category === expenseFilter)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ausgaben</h2>
            <p className="text-gray-600">Verwalte Ausgaben für {currentTrip.flag} {currentTrip.name}</p>
          </div>
          <button
            onClick={() => {
              resetExpenseForm()
              setEditingExpense(null)
              setShowExpenseModal(true)
            }}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            <span>Ausgabe hinzufügen</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-100">Gesamt</span>
              <span className="text-3xl">💰</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: currentTrip.currency 
              }).format(totalExpenses)}
            </div>
            <div className="text-blue-100 text-sm">{expenses.length} Ausgaben</div>
          </div>

          {/* Per Person */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-teal-100">Pro Person</span>
              <span className="text-3xl">👤</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: currentTrip.currency 
              }).format(tripMembers.length > 0 ? totalExpenses / tripMembers.length : 0)}
            </div>
            <div className="text-teal-100 text-sm">Ø bei {tripMembers.length} Personen</div>
          </div>

          {/* Top Category */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-100">Top Kategorie</span>
              <span className="text-3xl">📊</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {Object.keys(expensesByCategory).length > 0
                ? Object.entries(expensesByCategory).sort((a: any, b: any) => b[1] - a[1])[0][0].split(' ')[0]
                : '—'}
            </div>
            <div className="text-purple-100 text-sm">
              {Object.keys(expensesByCategory).length > 0
                ? new Intl.NumberFormat('de-DE', { 
                    style: 'currency', 
                    currency: currentTrip.currency 
                  }).format(Object.entries(expensesByCategory).sort((a: any, b: any) => b[1] - a[1])[0][1] as number)
                : 'Noch keine Ausgaben'}
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter:</span>
            <button
              onClick={() => setExpenseFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                expenseFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({expenses.length})
            </button>
            {expenseCategories.map((cat) => {
              const count = expenses.filter(e => e.category === `${cat.emoji} ${cat.label}`).length
              return (
                <button
                  key={cat.label}
                  onClick={() => setExpenseFilter(`${cat.emoji} ${cat.label}`)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    expenseFilter === `${cat.emoji} ${cat.label}`
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.emoji} {cat.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold">
              📝 Ausgaben ({filteredExpenses.length})
            </h3>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">
                {expenseFilter === 'all' ? 'Noch keine Ausgaben' : 'Keine Ausgaben in dieser Kategorie'}
              </h3>
              <p className="text-gray-600 mb-6">
                {expenseFilter === 'all' 
                  ? 'Füge die erste Ausgabe hinzu!' 
                  : 'Wähle eine andere Kategorie oder füge eine Ausgabe hinzu.'}
              </p>
              <button
                onClick={() => {
                  resetExpenseForm()
                  setShowExpenseModal(true)
                }}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 inline-flex items-center gap-2"
              >
                <span>➕</span>
                <span>Erste Ausgabe hinzufügen</span>
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Category Icon */}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {expense.category.split(' ')[0]}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {expense.description}
                          </h4>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {expense.category.replace(/^[^\s]+ /, '')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span>💳</span>
                            <span>Bezahlt von: <strong>{expense.payer?.name || 'Unbekannt'}</strong></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>👥</span>
                            <span>Geteilt durch: <strong>{expense.split_between?.length || 0} Person(en)</strong></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>{new Date(expense.date).toLocaleDateString('de-DE')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {new Intl.NumberFormat('de-DE', { 
                            style: 'currency', 
                            currency: currentTrip.currency 
                          }).format(expense.amount)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Intl.NumberFormat('de-DE', { 
                            style: 'currency', 
                            currency: currentTrip.currency 
                          }).format(expense.amount / (expense.split_between?.length || 1))} / Person
                        </div>
                      </div>

                      {/* Edit & Delete */}
                      {(expense.user_id === currentUser?.id || 
                        tripMembers.find(m => m.user_id === currentUser?.id)?.role === 'owner' ||
                        tripMembers.find(m => m.user_id === currentUser?.id)?.role === 'admin') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingExpense(expense)
                              setShowExpenseModal(true)
                            }}
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id, expense.description)}
                            disabled={loadingAction}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTeamTab = () => {
    if (!currentTrip) {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-2">Keine Reise ausgewählt</h3>
          <p className="text-gray-600">Wähle zuerst eine Reise aus, um das Team zu verwalten.</p>
        </div>
      )
    }

    const currentUserMember = tripMembers.find(m => m.user_id === currentUser?.id)
    const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
            <p className="text-gray-600">Verwalte Mitglieder für {currentTrip.flag} {currentTrip.name}</p>
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">➕</span>
              <span>Mitglied einladen</span>
            </button>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && isOwnerOrAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">
              📬 Ausstehende Einladungen ({pendingInvitations.length})
            </h3>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">📧</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invitation.invited_email}</p>
                      <p className="text-sm text-gray-600">
                        Eingeladen am {new Date(invitation.created_at).toLocaleDateString('de-DE')}
                        {' • Läuft ab am '}{new Date(invitation.expires_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelInvitation(invitation.id)}
                    disabled={loadingAction}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Zurückziehen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold">👥 Mitglieder ({tripMembers.length})</h3>
          </div>

          {tripMembers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">Noch keine Mitglieder</h3>
              <p className="text-gray-600 mb-6">Lade Personen ein, um gemeinsam zu planen!</p>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 inline-flex items-center gap-2"
                >
                  <span>➕</span>
                  <span>Erste Person einladen</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {tripMembers.map((member) => {
                const isCurrentUser = member.user_id === currentUser?.id
                const memberIsOwner = member.role === 'owner'
                
                return (
                  <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {member.user?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {member.user?.name || 'Unbekannt'}
                            </h4>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Du
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{member.user?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Beigetreten: {new Date(member.joined_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>

                      {/* Role & Actions */}
                      <div className="flex items-center gap-3">
                        {/* Role Badge/Selector */}
                        {isOwnerOrAdmin && !memberIsOwner && !isCurrentUser ? (
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value)}
                            disabled={loadingAction}
                            className={`px-3 py-1 rounded-full text-sm font-medium border-2 cursor-pointer
                              ${member.role === 'owner' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                member.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                'bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            <option value="member">👤 Member</option>
                            <option value="admin">⭐ Admin</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium
                            ${member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 
                              member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'}`}
                          >
                            {member.role === 'owner' ? '👑 Owner' : 
                             member.role === 'admin' ? '⭐ Admin' : 
                             '👤 Member'}
                          </span>
                        )}

                        {/* Remove Button */}
                        {isOwnerOrAdmin && !memberIsOwner && !isCurrentUser && (
                          <button
                            onClick={() => removeMember(member.id, member.user?.name || 'Mitglied')}
                            disabled={loadingAction}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Rollen-Erklärung</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li><strong>👑 Owner:</strong> Vollzugriff - kann Reise löschen und alle Mitglieder verwalten</li>
            <li><strong>⭐ Admin:</strong> Kann Mitglieder einladen, Ausgaben verwalten und Inhalte bearbeiten</li>
            <li><strong>👤 Member:</strong> Kann Inhalte sehen und eigene Ausgaben hinzufügen</li>
          </ul>
        </div>
      </div>
    )
  }

  const renderExpensesTab = () => {
    if (!currentTrip) {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-2">Keine Reise ausgewählt</h3>
          <p className="text-gray-600">Wähle zuerst eine Reise aus, um das Team zu verwalten.</p>
        </div>
      )
    }

    const currentUserMember = tripMembers.find(m => m.user_id === currentUser?.id)
    const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
            <p className="text-gray-600">Verwalte Mitglieder für {currentTrip.flag} {currentTrip.name}</p>
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">➕</span>
              <span>Mitglied einladen</span>
            </button>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && isOwnerOrAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">
              📬 Ausstehende Einladungen ({pendingInvitations.length})
            </h3>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">📧</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{invitation.invited_email}</p>
                      <p className="text-sm text-gray-600">
                        Eingeladen am {new Date(invitation.created_at).toLocaleDateString('de-DE')}
                        {' • Läuft ab am '}{new Date(invitation.expires_at).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelInvitation(invitation.id)}
                    disabled={loadingAction}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Zurückziehen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold">👥 Mitglieder ({tripMembers.length})</h3>
          </div>

          {tripMembers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">Noch keine Mitglieder</h3>
              <p className="text-gray-600 mb-6">Lade Personen ein, um gemeinsam zu planen!</p>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 inline-flex items-center gap-2"
                >
                  <span>➕</span>
                  <span>Erste Person einladen</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {tripMembers.map((member) => {
                const isCurrentUser = member.user_id === currentUser?.id
                const memberIsOwner = member.role === 'owner'
                
                return (
                  <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {member.user?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">
                              {member.user?.name || 'Unbekannt'}
                            </h4>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Du
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{member.user?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Beigetreten: {new Date(member.joined_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>

                      {/* Role & Actions */}
                      <div className="flex items-center gap-3">
                        {/* Role Badge/Selector */}
                        {isOwnerOrAdmin && !memberIsOwner && !isCurrentUser ? (
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value)}
                            disabled={loadingAction}
                            className={`px-3 py-1 rounded-full text-sm font-medium border-2 cursor-pointer
                              ${member.role === 'owner' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                member.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                'bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            <option value="member">👤 Member</option>
                            <option value="admin">⭐ Admin</option>
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm font-medium
                            ${member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 
                              member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'}`}
                          >
                            {member.role === 'owner' ? '👑 Owner' : 
                             member.role === 'admin' ? '⭐ Admin' : 
                             '👤 Member'}
                          </span>
                        )}

                        {/* Remove Button */}
                        {isOwnerOrAdmin && !memberIsOwner && !isCurrentUser && (
                          <button
                            onClick={() => removeMember(member.id, member.user?.name || 'Mitglied')}
                            disabled={loadingAction}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Rollen-Erklärung</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li><strong>👑 Owner:</strong> Vollzugriff - kann Reise löschen und alle Mitglieder verwalten</li>
            <li><strong>⭐ Admin:</strong> Kann Mitglieder einladen, Ausgaben verwalten und Inhalte bearbeiten</li>
            <li><strong>👤 Member:</strong> Kann Inhalte sehen und eigene Ausgaben hinzufügen</li>
          </ul>
        </div>
      </div>
    )
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'trips': return renderTripsTab()
      case 'expenses': return renderExpensesTab()
      case 'itinerary': return renderPlaceholder('Reiseplan', '🗓️')
      case 'packing': return renderPlaceholder('Packliste', '🎒')
      case 'map': return renderPlaceholder('Karte', '🗺️')
      case 'friends': return renderTeamTab()
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

  const renderExpenseModal = () => {
    if (!showExpenseModal) return null

    const isEditing = !!editingExpense
    const modalExpense = isEditing ? editingExpense : newExpense

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-8 max-w-2xl w-full my-8">
          <h2 className="text-2xl font-bold mb-6">
            {isEditing ? '✏️ Ausgabe bearbeiten' : '➕ Neue Ausgabe'}
          </h2>
          
          <div className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Kategorie *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {expenseCategories.map((cat) => {
                  const fullCategory = `${cat.emoji} ${cat.label}`
                  const isSelected = modalExpense.category === fullCategory
                  
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setEditingExpense({...editingExpense, category: fullCategory})
                        } else {
                          setNewExpense({...newExpense, category: fullCategory})
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-1">{cat.emoji}</div>
                      <div className="text-xs font-medium text-gray-700">{cat.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Beschreibung *</label>
                <input 
                  type="text"
                  placeholder="z.B. Restaurant am Strand"
                  value={modalExpense.description}
                  onChange={(e) => {
                    if (isEditing) {
                      setEditingExpense({...editingExpense, description: e.target.value})
                    } else {
                      setNewExpense({...newExpense, description: e.target.value})
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Betrag * ({currentTrip?.currency})</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={modalExpense.amount}
                  onChange={(e) => {
                    if (isEditing) {
                      setEditingExpense({...editingExpense, amount: e.target.value})
                    } else {
                      setNewExpense({...newExpense, amount: e.target.value})
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Datum</label>
              <input 
                type="date"
                value={modalExpense.date}
                onChange={(e) => {
                  if (isEditing) {
                    setEditingExpense({...editingExpense, date: e.target.value})
                  } else {
                    setNewExpense({...newExpense, date: e.target.value})
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Paid By */}
            <div>
              <label className="block text-sm font-medium mb-2">Bezahlt von *</label>
              <select
                value={modalExpense.paid_by}
                onChange={(e) => {
                  if (isEditing) {
                    setEditingExpense({...editingExpense, paid_by: e.target.value})
                  } else {
                    setNewExpense({...newExpense, paid_by: e.target.value})
                  }
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Person auswählen --</option>
                {tripMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.name} {member.user_id === currentUser?.id ? '(Du)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Between */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">Aufteilen zwischen *</label>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setEditingExpense({
                        ...editingExpense,
                        split_between: tripMembers.map(m => m.user_id)
                      })
                    } else {
                      selectAllForSplit()
                    }
                  }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Alle auswählen
                </button>
              </div>
              
              <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {tripMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Keine Mitglieder verfügbar. Gehe zum Team Tab um Mitglieder hinzuzufügen.
                  </p>
                ) : (
                  tripMembers.map((member) => {
                    const isSelected = modalExpense.split_between?.includes(member.user_id)
                    
                    return (
                      <label
                        key={member.user_id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isEditing) {
                              const newSplit = isSelected
                                ? editingExpense.split_between.filter((id: string) => id !== member.user_id)
                                : [...editingExpense.split_between, member.user_id]
                              setEditingExpense({...editingExpense, split_between: newSplit})
                            } else {
                              toggleSplitPerson(member.user_id)
                            }
                          }}
                          className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {member.user?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {member.user?.name}
                            {member.user_id === currentUser?.id && (
                              <span className="text-xs text-gray-500 ml-2">(Du)</span>
                            )}
                          </div>
                        </div>
                        {modalExpense.amount && isSelected && (
                          <div className="text-sm text-gray-600">
                            {new Intl.NumberFormat('de-DE', { 
                              style: 'currency', 
                              currency: currentTrip?.currency || 'EUR'
                            }).format(parseFloat(modalExpense.amount) / (modalExpense.split_between?.length || 1))}
                          </div>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
              
              {modalExpense.split_between && modalExpense.split_between.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {modalExpense.split_between.length} Person(en) ausgewählt
                  {modalExpense.amount && (
                    <span className="font-medium">
                      {' • '}
                      {new Intl.NumberFormat('de-DE', { 
                        style: 'currency', 
                        currency: currentTrip?.currency || 'EUR'
                      }).format(parseFloat(modalExpense.amount) / modalExpense.split_between.length)} pro Person
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button 
              onClick={() => {
                setShowExpenseModal(false)
                setEditingExpense(null)
                resetExpenseForm()
              }}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loadingAction}
            >
              Abbrechen
            </button>
            <button 
              onClick={isEditing ? updateExpense : createExpense}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loadingAction ? 'Lädt...' : (isEditing ? 'Speichern' : 'Hinzufügen')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderInviteModal = () => {
    if (!showInviteModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">✉️ Mitglied einladen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">E-Mail Adresse *</label>
              <input 
                type="email"
                placeholder="beispiel@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Hinweis:</strong> Die eingeladene Person erhält einen Link per Email 
                und kann der Reise beitreten. Die Einladung ist 7 Tage gültig.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowInviteModal(false)
                setInviteEmail('')
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
              disabled={loadingAction}
            >
              Abbrechen
            </button>
            <button 
              onClick={inviteUserToTrip}
              disabled={loadingAction || !inviteEmail}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {loadingAction ? 'Lädt...' : 'Einladen'}
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
      {renderInviteModal()}
      {renderExpenseModal()}
    </div>
  )
}
