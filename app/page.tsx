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

  // ========== SETTLEMENT STATE ==========
  const [settlements, setSettlements] = useState<any[]>([])
  const [showSettlementModal, setShowSettlementModal] = useState(false)

  // ========== PACKING LIST STATE ==========
  const [packingItems, setPackingItems] = useState<any[]>([])
  const [showPackingModal, setShowPackingModal] = useState(false)
  const [editingPackingItem, setEditingPackingItem] = useState<any>(null)
  const [packingFilter, setPackingFilter] = useState<string>('all') // 'all', 'packed', 'unpacked', 'essential'
  const [newPackingItem, setNewPackingItem] = useState({
    category: '👕 Kleidung',
    item: '',
    packed: false,
    essential: false
  })

  const packingCategories = [
    { id: '👕 Kleidung', icon: '👕', label: 'Kleidung' },
    { id: '📱 Elektronik', icon: '📱', label: 'Elektronik' },
    { id: '🧴 Hygiene', icon: '🧴', label: 'Hygiene' },
    { id: '📄 Dokumente', icon: '📄', label: 'Dokumente' },
    { id: '💊 Medikamente', icon: '💊', label: 'Medikamente' },
    { id: '🎒 Sonstiges', icon: '🎒', label: 'Sonstiges' }
  ]

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
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('created_by', userData.id)
        .order('created_at', { ascending: false })

      console.log('📊 Trips query result:', { data, error })

      if (error) throw error
      
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
        // Load packing items for the first trip
        await loadPackingItems(data[0].id)
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

      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripData.id,
          user_id: currentUser.id,
          role: 'owner'
        })

      if (memberError) throw memberError

      setAuthMessage({ type: 'success', text: '✅ Reise erstellt!' })
      await loadAllTrips()
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
          start_date: editingTrip.start_date || null,
          end_date: editingTrip.end_date || null,
          currency: editingTrip.currency,
          status: editingTrip.status
        })
        .eq('id', editingTrip.id)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Reise aktualisiert!' })
      await loadAllTrips()
      setShowEditTripModal(false)
      setEditingTrip(null)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const deleteTrip = async (tripId: string) => {
    if (!confirm('Möchtest du diese Reise wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Reise gelöscht!' })
      await loadAllTrips()
      if (currentTrip?.id === tripId) {
        setCurrentTrip(allUserTrips[0] || null)
      }
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
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
      setAuthMessage({ type: 'error', text: '❌ Alle Felder sind Pflichtfelder!' })
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

      if (!response.ok) throw new Error(result.error || 'Fehler beim Erstellen')

      setAuthMessage({ type: 'success', text: '✅ Benutzer erstellt!' })
      await loadUsers()
      setShowAddUserModal(false)
      setNewUser({ email: '', password: '', name: '' })
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
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

      setAuthMessage({ type: 'success', text: '✅ Benutzer gelöscht!' })
      await loadUsers()
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
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

      if (error) throw error
      setTripMembers(data || [])
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const inviteUser = async () => {
    if (!inviteEmail || !currentTrip) return

    setLoadingAction(true)
    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
      
      const { error } = await supabase
        .from('invitations')
        .insert({
          trip_id: currentTrip.id,
          invited_by: currentUser.id,
          invited_email: inviteEmail,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Einladung versendet!' })
      setShowInviteModal(false)
      setInviteEmail('')
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  // ========== EXPENSES FUNCTIONS ==========
  const loadExpenses = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const createOrUpdateExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.paid_by) {
      setAuthMessage({ type: 'error', text: '❌ Bitte alle Pflichtfelder ausfüllen!' })
      return
    }

    if (newExpense.split_between.length === 0) {
      setAuthMessage({ type: 'error', text: '❌ Bitte mindestens eine Person für die Aufteilung auswählen!' })
      return
    }

    setLoadingAction(true)
    try {
      const expenseData = {
        trip_id: currentTrip.id,
        category: newExpense.category,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        paid_by: newExpense.paid_by,
        split_between: newExpense.split_between,
        date: newExpense.date,
        user_id: currentUser.id
      }

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Ausgabe aktualisiert!' })
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Ausgabe hinzugefügt!' })
      }

      await loadExpenses(currentTrip.id)
      setShowExpenseModal(false)
      setEditingExpense(null)
      setNewExpense({
        category: '🍕 Essen & Trinken',
        description: '',
        amount: '',
        paid_by: '',
        split_between: [],
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const deleteExpense = async (expenseId: string) => {
    if (!confirm('Möchtest du diese Ausgabe wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Ausgabe gelöscht!' })
      await loadExpenses(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const calculateSettlements = () => {
    if (!expenses.length) return

    const balances: { [key: string]: number } = {}
    
    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount.toString())
      const splitAmount = amount / expense.split_between.length

      if (!balances[expense.paid_by]) balances[expense.paid_by] = 0
      balances[expense.paid_by] += amount

      expense.split_between.forEach((person: string) => {
        if (!balances[person]) balances[person] = 0
        balances[person] -= splitAmount
      })
    })

    const creditors = Object.entries(balances).filter(([_, balance]) => balance > 0.01)
    const debtors = Object.entries(balances).filter(([_, balance]) => balance < -0.01)

    const newSettlements: any[] = []

    debtors.forEach(([debtor, debtAmount]) => {
      let remaining = Math.abs(debtAmount)
      
      creditors.forEach(([creditor, creditAmount]) => {
        if (remaining > 0.01 && creditAmount > 0.01) {
          const transferAmount = Math.min(remaining, creditAmount)
          newSettlements.push({
            from: debtor,
            to: creditor,
            amount: transferAmount
          })
          remaining -= transferAmount
          balances[creditor] -= transferAmount
        }
      })
    })

    setSettlements(newSettlements)
    setShowSettlementModal(true)
  }

  // ========== PACKING LIST FUNCTIONS ==========
  const loadPackingItems = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('packing_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('category', { ascending: true })
        .order('essential', { ascending: false })

      if (error) throw error
      setPackingItems(data || [])
    } catch (error) {
      console.error('Error loading packing items:', error)
    }
  }

  const createOrUpdatePackingItem = async () => {
    if (!newPackingItem.item.trim()) {
      setAuthMessage({ type: 'error', text: '❌ Bitte einen Item-Namen eingeben!' })
      return
    }

    if (!currentTrip) {
      setAuthMessage({ type: 'error', text: '❌ Keine Reise ausgewählt!' })
      return
    }

    setLoadingAction(true)
    try {
      const packingData = {
        trip_id: currentTrip.id,
        category: newPackingItem.category,
        item: newPackingItem.item.trim(),
        packed: newPackingItem.packed,
        essential: newPackingItem.essential
      }

      if (editingPackingItem) {
        const { error } = await supabase
          .from('packing_items')
          .update(packingData)
          .eq('id', editingPackingItem.id)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Item aktualisiert!' })
      } else {
        const { error } = await supabase
          .from('packing_items')
          .insert(packingData)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Item hinzugefügt!' })
      }

      await loadPackingItems(currentTrip.id)
      setShowPackingModal(false)
      setEditingPackingItem(null)
      setNewPackingItem({
        category: '👕 Kleidung',
        item: '',
        packed: false,
        essential: false
      })
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const togglePackedStatus = async (item: any) => {
    try {
      const { error } = await supabase
        .from('packing_items')
        .update({ packed: !item.packed })
        .eq('id', item.id)

      if (error) throw error
      await loadPackingItems(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const deletePackingItem = async (itemId: string) => {
    if (!confirm('Möchtest du diesen Item wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('packing_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Item gelöscht!' })
      await loadPackingItems(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const getPackingProgress = () => {
    if (packingItems.length === 0) return 0
    const packedCount = packingItems.filter(item => item.packed).length
    return Math.round((packedCount / packingItems.length) * 100)
  }

  const getFilteredPackingItems = () => {
    let filtered = packingItems

    if (packingFilter === 'packed') {
      filtered = filtered.filter(item => item.packed)
    } else if (packingFilter === 'unpacked') {
      filtered = filtered.filter(item => !item.packed)
    } else if (packingFilter === 'essential') {
      filtered = filtered.filter(item => item.essential)
    }

    return filtered
  }

  const groupPackingItemsByCategory = () => {
    const filtered = getFilteredPackingItems()
    const grouped: { [key: string]: any[] } = {}

    filtered.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = []
      }
      grouped[item.category].push(item)
    })

    return grouped
  }

  // ========== EFFECT HOOKS ==========
  useEffect(() => {
    if (currentTrip) {
      loadTripMembers(currentTrip.id)
      loadExpenses(currentTrip.id)
      loadPackingItems(currentTrip.id)
    }
  }, [currentTrip])

  // ========== RENDER FUNCTIONS ==========
  const renderOverview = () => {
    if (!currentTrip) {
      return (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🌍</span>
          <p className="text-gray-600 mb-4">Keine Reise ausgewählt</p>
          <button
            onClick={() => setActiveTab('trips')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Reise erstellen
          </button>
        </div>
      )
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0)
    const packingProgress = getPackingProgress()

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {currentTrip.flag} {currentTrip.name}
              </h2>
              <p className="text-gray-600">{currentTrip.destination}</p>
            </div>
            <button
              onClick={() => {
                setEditingTrip(currentTrip)
                setShowEditTripModal(true)
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              ✏️ Bearbeiten
            </button>
          </div>

          {currentTrip.start_date && (
            <div className="flex gap-4 text-sm text-gray-600">
              <span>📅 {new Date(currentTrip.start_date).toLocaleDateString('de-DE')}</span>
              {currentTrip.end_date && (
                <span>→ {new Date(currentTrip.end_date).toLocaleDateString('de-DE')}</span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">💰</span>
              <span className="text-sm text-gray-600">Ausgaben</span>
            </div>
            <div className="text-2xl font-bold">
              {totalExpenses.toFixed(2)} {currentTrip.currency}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {expenses.length} Einträge
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">🎒</span>
              <span className="text-sm text-gray-600">Packliste</span>
            </div>
            <div className="text-2xl font-bold">{packingProgress}%</div>
            <div className="text-sm text-gray-600 mt-1">
              {packingItems.filter(i => i.packed).length} / {packingItems.length} gepackt
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">👥</span>
              <span className="text-sm text-gray-600">Team</span>
            </div>
            <div className="text-2xl font-bold">{tripMembers.length}</div>
            <div className="text-sm text-gray-600 mt-1">Mitglieder</div>
          </div>
        </div>
      </div>
    )
  }

  const renderTripsTab = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Meine Reisen</h2>
          <button
            onClick={() => setShowNewTripModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + Neue Reise
          </button>
        </div>

        {allUserTrips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">✈️</span>
            <p className="text-gray-600 mb-4">Noch keine Reisen geplant</p>
            <button
              onClick={() => setShowNewTripModal(true)}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Erste Reise erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUserTrips.map(trip => (
              <div
                key={trip.id}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
                  currentTrip?.id === trip.id ? 'ring-2 ring-teal-600' : 'hover:shadow-lg'
                }`}
                onClick={() => setCurrentTrip(trip)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {trip.flag} {trip.name}
                    </h3>
                    <p className="text-gray-600">{trip.destination}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTrip(trip)
                        setShowEditTripModal(true)
                      }}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTrip(trip.id)
                      }}
                      className="p-2 hover:bg-red-100 rounded text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {trip.start_date && (
                  <div className="text-sm text-gray-600 mb-3">
                    📅 {new Date(trip.start_date).toLocaleDateString('de-DE')}
                    {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString('de-DE')}`}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <span className={`px-2 py-1 rounded ${
                    trip.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {trip.status === 'active' ? 'Aktiv' : 'Archiviert'}
                  </span>
                  <span className="text-gray-600">
                    👥 {trip.memberCount || 0} Mitglieder
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderExpensesTab = () => {
    if (!currentTrip) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Bitte wähle zuerst eine Reise aus</p>
        </div>
      )
    }

    const filteredExpenses = expenseFilter === 'all' 
      ? expenses 
      : expenses.filter(exp => exp.category === expenseFilter)

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ausgaben</h2>
          <div className="flex gap-2">
            <button
              onClick={calculateSettlements}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              💳 Abrechnen
            </button>
            <button
              onClick={() => {
                setEditingExpense(null)
                setNewExpense({
                  category: '🍕 Essen & Trinken',
                  description: '',
                  amount: '',
                  paid_by: '',
                  split_between: [],
                  date: new Date().toISOString().split('T')[0]
                })
                setShowExpenseModal(true)
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              + Ausgabe hinzufügen
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Gesamt</div>
              <div className="text-3xl font-bold">
                {totalAmount.toFixed(2)} {currentTrip.currency}
              </div>
            </div>
            <select
              value={expenseFilter}
              onChange={(e) => setExpenseFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Alle Kategorien</option>
              <option value="🍕 Essen & Trinken">🍕 Essen & Trinken</option>
              <option value="🏨 Unterkunft">🏨 Unterkunft</option>
              <option value="🚗 Transport">🚗 Transport</option>
              <option value="🎟️ Aktivitäten">🎟️ Aktivitäten</option>
              <option value="🛒 Einkäufe">🛒 Einkäufe</option>
              <option value="💊 Gesundheit">💊 Gesundheit</option>
              <option value="📱 Sonstiges">📱 Sonstiges</option>
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">💰</span>
            <p className="text-gray-600 mb-4">Noch keine Ausgaben erfasst</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{expense.category.split(' ')[0]}</span>
                      <span className="font-semibold">{expense.description}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>💳 Bezahlt von: {expense.paid_by}</div>
                      <div>👥 Geteilt zwischen: {expense.split_between.join(', ')}</div>
                      <div>📅 {new Date(expense.date).toLocaleDateString('de-DE')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {parseFloat(expense.amount.toString()).toFixed(2)} {currentTrip.currency}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setEditingExpense(expense)
                          setNewExpense({
                            category: expense.category,
                            description: expense.description,
                            amount: expense.amount.toString(),
                            paid_by: expense.paid_by,
                            split_between: expense.split_between,
                            date: expense.date
                          })
                          setShowExpenseModal(true)
                        }}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-2 hover:bg-red-100 rounded text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderPackingTab = () => {
    if (!currentTrip) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Bitte wähle zuerst eine Reise aus</p>
        </div>
      )
    }

    const groupedItems = groupPackingItemsByCategory()
    const packingProgress = getPackingProgress()
    const packedCount = packingItems.filter(item => item.packed).length
    const essentialCount = packingItems.filter(item => item.essential).length

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Packliste</h2>
          <button
            onClick={() => {
              setEditingPackingItem(null)
              setNewPackingItem({
                category: '👕 Kleidung',
                item: '',
                packed: false,
                essential: false
              })
              setShowPackingModal(true)
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + Item hinzufügen
          </button>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600">Fortschritt</div>
              <div className="text-3xl font-bold">{packingProgress}%</div>
              <div className="text-sm text-gray-600 mt-1">
                {packedCount} von {packingItems.length} gepackt
                {essentialCount > 0 && ` • ${essentialCount} wichtig`}
              </div>
            </div>
            <div className="w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="3"
                  strokeDasharray={`${packingProgress}, 100`}
                />
                <text
                  x="18"
                  y="20.5"
                  className="text-xs font-bold"
                  textAnchor="middle"
                  fill="#0d9488"
                >
                  {packingProgress}%
                </text>
              </svg>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPackingFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm ${
                packingFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({packingItems.length})
            </button>
            <button
              onClick={() => setPackingFilter('unpacked')}
              className={`px-3 py-1 rounded-lg text-sm ${
                packingFilter === 'unpacked'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Offen ({packingItems.length - packedCount})
            </button>
            <button
              onClick={() => setPackingFilter('packed')}
              className={`px-3 py-1 rounded-lg text-sm ${
                packingFilter === 'packed'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Gepackt ({packedCount})
            </button>
            <button
              onClick={() => setPackingFilter('essential')}
              className={`px-3 py-1 rounded-lg text-sm ${
                packingFilter === 'essential'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⭐ Wichtig ({essentialCount})
            </button>
          </div>
        </div>

        {/* Packing Items by Category */}
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">🎒</span>
            <p className="text-gray-600 mb-4">Noch keine Items in der Packliste</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, items]) => {
              const categoryIcon = packingCategories.find(c => c.id === category)?.icon || '🎒'
              const categoryLabel = packingCategories.find(c => c.id === category)?.label || category
              const categoryPacked = items.filter(item => item.packed).length
              const categoryProgress = Math.round((categoryPacked / items.length) * 100)

              return (
                <div key={category} className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoryIcon}</span>
                      <div>
                        <h3 className="font-semibold">{categoryLabel}</h3>
                        <p className="text-sm text-gray-600">
                          {categoryPacked} / {items.length} gepackt ({categoryProgress}%)
                        </p>
                      </div>
                    </div>
                    <div className="w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#0d9488"
                          strokeWidth="3"
                          strokeDasharray={`${categoryProgress}, 100`}
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          item.packed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.packed}
                          onChange={() => togglePackedStatus(item)}
                          className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className={`${item.packed ? 'line-through text-gray-500' : ''}`}>
                            {item.item}
                          </span>
                          {item.essential && (
                            <span className="ml-2 text-yellow-500">⭐</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPackingItem(item)
                              setNewPackingItem({
                                category: item.category,
                                item: item.item,
                                packed: item.packed,
                                essential: item.essential
                              })
                              setShowPackingModal(true)
                            }}
                            className="p-1 hover:bg-white rounded"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deletePackingItem(item.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderAdminTab = () => {
    if (currentUser?.role !== 'admin') {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Nur für Administratoren zugänglich</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Admin Panel</h2>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + Benutzer erstellen
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-gray-600">Benutzer</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">🌍</div>
            <div className="text-2xl font-bold">{allUserTrips.length}</div>
            <div className="text-sm text-gray-600">Reisen</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="text-2xl font-bold">v2.0</div>
            <div className="text-sm text-gray-600">Version</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-lg">Alle Benutzer</h3>
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Rolle</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3">{user.name}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => deleteUser(user.id)}
                        disabled={user.id === currentUser.id}
                        className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Löschen
                      </button>
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'trips':
        return renderTripsTab()
      case 'expenses':
        return renderExpensesTab()
      case 'packing':
        return renderPackingTab()
      case 'admin':
        return renderAdminTab()
      default:
        return (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">🚧</span>
            <p className="text-gray-600">Dieser Tab ist noch in Entwicklung</p>
          </div>
        )
    }
  }

  // ========== MODAL COMPONENTS ==========
  const renderNewTripModal = () => {
    if (!showNewTripModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">Neue Reise erstellen</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reisename *</label>
              <input 
                type="text"
                placeholder="z.B. Sommerurlaub 2025"
                value={newTripData.name}
                onChange={(e) => setNewTripData({...newTripData, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ziel *</label>
              <input 
                type="text"
                placeholder="z.B. Italien"
                value={newTripData.destination}
                onChange={(e) => setNewTripData({...newTripData, destination: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Icon/Flag</label>
              <div className="grid grid-cols-10 gap-2">
                {popularFlags.map(flag => (
                  <button
                    key={flag}
                    onClick={() => setNewTripData({...newTripData, flag})}
                    className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                      newTripData.flag === flag ? 'bg-teal-100 ring-2 ring-teal-500' : ''
                    }`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={createTrip}
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

  const renderEditTripModal = () => {
    if (!showEditTripModal || !editingTrip) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">Reise bearbeiten</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reisename *</label>
              <input 
                type="text"
                value={editingTrip.name}
                onChange={(e) => setEditingTrip({...editingTrip, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ziel *</label>
              <input 
                type="text"
                value={editingTrip.destination}
                onChange={(e) => setEditingTrip({...editingTrip, destination: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Icon/Flag</label>
              <div className="grid grid-cols-10 gap-2">
                {popularFlags.map(flag => (
                  <button
                    key={flag}
                    onClick={() => setEditingTrip({...editingTrip, flag})}
                    className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                      editingTrip.flag === flag ? 'bg-teal-100 ring-2 ring-teal-500' : ''
                    }`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Startdatum</label>
                <input 
                  type="date"
                  value={editingTrip.start_date || ''}
                  onChange={(e) => setEditingTrip({...editingTrip, start_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Enddatum</label>
                <input 
                  type="date"
                  value={editingTrip.end_date || ''}
                  onChange={(e) => setEditingTrip({...editingTrip, end_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Währung</label>
              <select
                value={editingTrip.currency}
                onChange={(e) => setEditingTrip({...editingTrip, currency: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CHF">CHF (Fr.)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={editingTrip.status}
                onChange={(e) => setEditingTrip({...editingTrip, status: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
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
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={updateTrip}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderExpenseModal = () => {
    if (!showExpenseModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">
            {editingExpense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kategorie</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="🍕 Essen & Trinken">🍕 Essen & Trinken</option>
                <option value="🏨 Unterkunft">🏨 Unterkunft</option>
                <option value="🚗 Transport">🚗 Transport</option>
                <option value="🎟️ Aktivitäten">🎟️ Aktivitäten</option>
                <option value="🛒 Einkäufe">🛒 Einkäufe</option>
                <option value="💊 Gesundheit">💊 Gesundheit</option>
                <option value="📱 Sonstiges">📱 Sonstiges</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Beschreibung *</label>
              <input 
                type="text"
                placeholder="z.B. Restaurant am Hafen"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Betrag * ({currentTrip?.currency})</label>
              <input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bezahlt von *</label>
              <input 
                type="text"
                placeholder="Name"
                value={newExpense.paid_by}
                onChange={(e) => setNewExpense({...newExpense, paid_by: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Geteilt zwischen * (Komma-getrennt)</label>
              <input 
                type="text"
                placeholder="z.B. Anna, Ben, Clara"
                value={newExpense.split_between.join(', ')}
                onChange={(e) => setNewExpense({
                  ...newExpense, 
                  split_between: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Trennen Sie Namen mit Kommas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Datum</label>
              <input 
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowExpenseModal(false)
                setEditingExpense(null)
                setNewExpense({
                  category: '🍕 Essen & Trinken',
                  description: '',
                  amount: '',
                  paid_by: '',
                  split_between: [],
                  date: new Date().toISOString().split('T')[0]
                })
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={createOrUpdateExpense}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Speichere...' : (editingExpense ? 'Aktualisieren' : 'Hinzufügen')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderPackingModal = () => {
    if (!showPackingModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">
            {editingPackingItem ? 'Item bearbeiten' : 'Neues Item'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kategorie</label>
              <select
                value={newPackingItem.category}
                onChange={(e) => setNewPackingItem({...newPackingItem, category: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {packingCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Item-Name *</label>
              <input 
                type="text"
                placeholder="z.B. Reisepass, T-Shirts, Zahnbürste"
                value={newPackingItem.item}
                onChange={(e) => setNewPackingItem({...newPackingItem, item: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPackingItem.packed}
                  onChange={(e) => setNewPackingItem({...newPackingItem, packed: e.target.checked})}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm">Bereits gepackt</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPackingItem.essential}
                  onChange={(e) => setNewPackingItem({...newPackingItem, essential: e.target.checked})}
                  className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                />
                <span className="text-sm">⭐ Wichtig</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowPackingModal(false)
                setEditingPackingItem(null)
                setNewPackingItem({
                  category: '👕 Kleidung',
                  item: '',
                  packed: false,
                  essential: false
                })
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={createOrUpdatePackingItem}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Speichere...' : (editingPackingItem ? 'Aktualisieren' : 'Hinzufügen')}
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
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">Mitglied einladen</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">E-Mail-Adresse</label>
              <input 
                type="email"
                placeholder="email@beispiel.de"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowInviteModal(false)
                setInviteEmail('')
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={inviteUser}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
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
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">Neuen Benutzer erstellen</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input 
                type="text"
                placeholder="Max Mustermann"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">E-Mail</label>
              <input 
                type="email"
                placeholder="email@beispiel.de"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Passwort</label>
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
      {renderPackingModal()}
    </div>
  )
}
