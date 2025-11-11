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
    console.log('🔍 Loading expenses for trip:', tripId)
    try {
      // Simplified query - load expenses first
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false })

      if (expensesError) {
        console.error('❌ Error loading expenses:', expensesError)
        throw expensesError
      }

      console.log(`✅ Loaded ${expensesData?.length || 0} expenses`)

      // Then manually add user info from tripMembers
      const enrichedExpenses = expensesData?.map(expense => {
        const creator = tripMembers.find(m => m.user_id === expense.user_id)
        const payer = tripMembers.find(m => m.user_id === expense.paid_by)
        
        return {
          ...expense,
          user: creator?.user || { name: 'Unbekannt', email: '' },
          payer: payer?.user || { name: 'Unbekannt', email: '' }
        }
      }) || []

      console.log('✅ Enriched expenses with user data')
      setExpenses(enrichedExpenses)
    } catch (error) {
      console.error('❌ Exception loading expenses:', error)
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

  // ========== SETTLEMENT FUNCTIONS ==========
  const calculateBalances = () => {
    if (!currentTrip || expenses.length === 0 || tripMembers.length === 0) {
      return []
    }

    // Initialize balances for all members
    const balances: { [userId: string]: number } = {}
    tripMembers.forEach(member => {
      balances[member.user_id] = 0
    })

    // Calculate balances from expenses
    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount)
      const splitCount = expense.split_between?.length || 1
      const amountPerPerson = amount / splitCount

      // Person who paid gets positive balance
      balances[expense.paid_by] = (balances[expense.paid_by] || 0) + amount

      // Everyone in split gets negative balance
      expense.split_between?.forEach((userId: string) => {
        balances[userId] = (balances[userId] || 0) - amountPerPerson
      })
    })

    // Convert to array with user info
    return Object.entries(balances).map(([userId, balance]) => {
      const member = tripMembers.find(m => m.user_id === userId)
      return {
        user_id: userId,
        user_name: member?.user?.name || 'Unbekannt',
        user_email: member?.user?.email || '',
        balance: balance,
        paid: expenses.filter(e => e.paid_by === userId).reduce((sum, e) => sum + parseFloat(e.amount), 0),
        owes: expenses
          .filter(e => e.split_between?.includes(userId))
          .reduce((sum, e) => sum + (parseFloat(e.amount) / (e.split_between?.length || 1)), 0)
      }
    }).sort((a, b) => b.balance - a.balance)
  }

  const calculateOptimizedTransactions = () => {
    const balances = calculateBalances()
    const transactions: Array<{from: string, to: string, amount: number, fromName: string, toName: string}> = []
    
    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors = balances.filter(b => b.balance > 0.01).map(b => ({...b}))
    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({...b, balance: Math.abs(b.balance)}))

    // Greedy algorithm to minimize transactions
    let creditorIndex = 0
    let debtorIndex = 0

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex]
      const debtor = debtors[debtorIndex]
      
      const amount = Math.min(creditor.balance, debtor.balance)
      
      transactions.push({
        from: debtor.user_id,
        to: creditor.user_id,
        amount: Math.round(amount * 100) / 100,
        fromName: debtor.user_name,
        toName: creditor.user_name
      })

      creditor.balance -= amount
      debtor.balance -= amount

      if (creditor.balance < 0.01) creditorIndex++
      if (debtor.balance < 0.01) debtorIndex++
    }

    return transactions
  }

  const markAsSettled = async (fromUserId: string, toUserId: string, amount: number) => {
    if (!currentTrip) return

    setLoadingAction(true)
    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          trip_id: currentTrip.id,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          amount: amount,
          settled_at: new Date().toISOString()
        })

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Als beglichen markiert!' })
      await loadSettlements(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const loadSettlements = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select(`
          *,
          from_user:users!settlements_from_user_id_fkey(name, email),
          to_user:users!settlements_to_user_id_fkey(name, email)
        `)
        .eq('trip_id', tripId)
        .order('settled_at', { ascending: false })

      if (error) throw error
      setSettlements(data || [])
    } catch (error) {
      console.error('Error loading settlements:', error)
    }
  }

  // Load settlements when needed
  useEffect(() => {
    if (currentTrip && activeTab === 'settlement') {
      if (expenses.length === 0) loadExpenses(currentTrip.id)
      if (tripMembers.length === 0) loadTripMembers(currentTrip.id)
      loadSettlements(currentTrip.id)
    }
  }, [currentTrip, activeTab])

  // Load data for overview
  useEffect(() => {
    if (currentTrip && activeTab === 'overview') {
      if (expenses.length === 0) loadExpenses(currentTrip.id)
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

  const renderOverview = () => {
    if (!currentTrip) {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-2">Keine Reise ausgewählt</h3>
          <p className="text-gray-600 mb-6">Wähle eine Reise aus um die Übersicht zu sehen.</p>
          <button
            onClick={() => setActiveTab('trips')}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 inline-flex items-center gap-2"
          >
            <span>🌍</span>
            <span>Zu Reisen</span>
          </button>
        </div>
      )
    }

    // Calculate statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)
    const balances = calculateBalances()
    const myBalance = balances.find(b => b.user_id === currentUser?.id)
    
    // Trip duration
    const startDate = currentTrip.start_date ? new Date(currentTrip.start_date) : null
    const endDate = currentTrip.end_date ? new Date(currentTrip.end_date) : null
    const today = new Date()
    const daysUntilStart = startDate ? Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
    const tripDuration = (startDate && endDate) ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : null

    // Category breakdown
    const expensesByCategory = expenses.reduce((acc: any, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount)
      return acc
    }, {})
    const topCategories = Object.entries(expensesByCategory)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)

    return (
      <div className="space-y-6">
        {/* Trip Header */}
        <div className="bg-gradient-to-br from-blue-500 to-teal-600 rounded-xl p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl">{currentTrip.flag}</span>
                <div>
                  <h1 className="text-3xl font-bold">{currentTrip.name}</h1>
                  <p className="text-blue-100 text-lg">{currentTrip.destination}</p>
                </div>
              </div>
              
              {(startDate || endDate) && (
                <div className="mt-4 flex items-center gap-6 text-blue-100">
                  {startDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wide">Start</div>
                      <div className="text-white font-semibold">
                        {startDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  {endDate && (
                    <div>
                      <div className="text-xs uppercase tracking-wide">Ende</div>
                      <div className="text-white font-semibold">
                        {endDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                  {tripDuration && (
                    <div>
                      <div className="text-xs uppercase tracking-wide">Dauer</div>
                      <div className="text-white font-semibold">{tripDuration} Tage</div>
                    </div>
                  )}
                </div>
              )}

              {daysUntilStart !== null && daysUntilStart > 0 && (
                <div className="mt-3 inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-white font-medium">
                    ⏰ Noch {daysUntilStart} {daysUntilStart === 1 ? 'Tag' : 'Tage'} bis zum Start
                  </span>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-sm text-blue-100">Status</div>
              <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                currentTrip.status === 'active' 
                  ? 'bg-green-400 text-green-900' 
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {currentTrip.status === 'active' ? '✅ Aktiv' : '📦 Archiviert'}
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Expenses */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Ausgaben</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: currentTrip.currency 
              }).format(totalExpenses)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{expenses.length} Transaktionen</div>
          </div>

          {/* My Balance */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Mein Saldo</span>
              <span className="text-2xl">
                {myBalance && myBalance.balance > 0.01 ? '💰' : 
                 myBalance && myBalance.balance < -0.01 ? '📉' : '✅'}
              </span>
            </div>
            <div className={`text-2xl font-bold ${
              myBalance && myBalance.balance > 0.01 ? 'text-green-600' :
              myBalance && myBalance.balance < -0.01 ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {myBalance ? (
                <>
                  {myBalance.balance > 0.01 && '+'}
                  {new Intl.NumberFormat('de-DE', { 
                    style: 'currency', 
                    currency: currentTrip.currency 
                  }).format(myBalance.balance)}
                </>
              ) : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {myBalance && myBalance.balance > 0.01 ? 'Du bekommst Geld' :
               myBalance && myBalance.balance < -0.01 ? 'Du schuldest Geld' :
               'Ausgeglichen'}
            </div>
          </div>

          {/* Team */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Team</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{tripMembers.length}</div>
            <div className="text-xs text-gray-500 mt-1">Mitglieder</div>
          </div>

          {/* Per Person */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Pro Person</span>
              <span className="text-2xl">👤</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: currentTrip.currency 
              }).format(tripMembers.length > 0 ? totalExpenses / tripMembers.length : 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Durchschnitt</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold">📊 Ausgaben nach Kategorie</h3>
            </div>
            
            {topCategories.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-2">💰</div>
                <p className="text-gray-600 text-sm">Noch keine Ausgaben erfasst</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {topCategories.map(([category, amount]: [string, any]) => {
                    const percentage = (amount / totalExpenses) * 100
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{category.split(' ')[0]}</span>
                            <span className="text-sm font-medium text-gray-700">
                              {category.replace(/^[^\s]+ /, '')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">
                              {new Intl.NumberFormat('de-DE', { 
                                style: 'currency', 
                                currency: currentTrip.currency 
                              }).format(amount)}
                            </div>
                            <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-teal-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold">👥 Team Mitglieder</h3>
            </div>
            
            {tripMembers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-600 text-sm">Noch keine Mitglieder</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-3">
                  {tripMembers.slice(0, 6).map((member) => {
                    const memberBalance = balances.find(b => b.user_id === member.user_id)
                    const isCurrentUser = member.user_id === currentUser?.id
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            memberBalance && memberBalance.balance > 0.01
                              ? 'bg-gradient-to-br from-green-400 to-green-500'
                              : memberBalance && memberBalance.balance < -0.01
                              ? 'bg-gradient-to-br from-red-400 to-red-500'
                              : 'bg-gradient-to-br from-blue-400 to-teal-500'
                          }`}>
                            <span className="text-white font-bold text-sm">
                              {member.user?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {member.user?.name || 'Unbekannt'}
                              </span>
                              {isCurrentUser && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  Du
                                </span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                              member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {member.role === 'owner' ? '👑 Owner' :
                               member.role === 'admin' ? '⭐ Admin' :
                               '👤 Member'}
                            </span>
                          </div>
                        </div>
                        {memberBalance && (
                          <div className={`text-sm font-bold ${
                            memberBalance.balance > 0.01 ? 'text-green-600' :
                            memberBalance.balance < -0.01 ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {memberBalance.balance > 0.01 && '+'}
                            {new Intl.NumberFormat('de-DE', { 
                              style: 'currency', 
                              currency: currentTrip.currency 
                            }).format(memberBalance.balance)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {tripMembers.length > 6 && (
                    <button
                      onClick={() => setActiveTab('friends')}
                      className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium pt-2"
                    >
                      +{tripMembers.length - 6} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-xl font-bold mb-4">⚡ Schnellzugriff</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => {
                setActiveTab('expenses')
                setTimeout(() => {
                  resetExpenseForm()
                  setShowExpenseModal(true)
                }, 100)
              }}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 rounded-lg transition-all"
            >
              <span className="text-3xl">💰</span>
              <span className="text-sm font-medium text-gray-900">Ausgabe hinzufügen</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all"
            >
              <span className="text-3xl">📊</span>
              <span className="text-sm font-medium text-gray-900">Ausgaben ansehen</span>
            </button>

            <button
              onClick={() => setActiveTab('settlement')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all"
            >
              <span className="text-3xl">💳</span>
              <span className="text-sm font-medium text-gray-900">Abrechnung</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all"
            >
              <span className="text-3xl">👥</span>
              <span className="text-sm font-medium text-gray-900">Team verwalten</span>
            </button>
          </div>
        </div>

        {/* Recent Expenses */}
        {expenses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold">🕐 Letzte Ausgaben</h3>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Alle anzeigen →
              </button>
            </div>
            <div className="divide-y">
              {expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{expense.category.split(' ')[0]}</span>
                      <div>
                        <div className="font-medium text-gray-900">{expense.description}</div>
                        <div className="text-xs text-gray-600">
                          {expense.payer?.name || 'Unbekannt'} • {new Date(expense.date).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {new Intl.NumberFormat('de-DE', { 
                          style: 'currency', 
                          currency: currentTrip.currency 
                        }).format(expense.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Intl.NumberFormat('de-DE', { 
                          style: 'currency', 
                          currency: currentTrip.currency 
                        }).format(expense.amount / (expense.split_between?.length || 1))} / Person
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

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

  const renderSettlementTab = () => {
    if (!currentTrip) {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-2">Keine Reise ausgewählt</h3>
          <p className="text-gray-600">Wähle zuerst eine Reise aus.</p>
        </div>
      )
    }

    if (expenses.length === 0) {
      return (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-xl font-bold mb-2">Noch keine Ausgaben</h3>
          <p className="text-gray-600 mb-6">
            Füge zuerst Ausgaben hinzu, um die Abrechnung zu sehen.
          </p>
          <button
            onClick={() => setActiveTab('expenses')}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 inline-flex items-center gap-2"
          >
            <span>➕</span>
            <span>Zu Ausgaben</span>
          </button>
        </div>
      )
    }

    const balances = calculateBalances()
    const transactions = calculateOptimizedTransactions()
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Abrechnung</h2>
            <p className="text-gray-600">Wer schuldet wem? • {currentTrip.flag} {currentTrip.name}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Gesamt-Ausgaben</div>
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: currentTrip.currency 
              }).format(totalExpenses)}
            </div>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold">💰 Saldo-Übersicht</h3>
          </div>

          <div className="divide-y">
            {balances.map((balance) => {
              const isCurrentUser = balance.user_id === currentUser?.id
              const isPositive = balance.balance > 0.01
              const isNegative = balance.balance < -0.01
              const isBalanced = !isPositive && !isNegative

              return (
                <div 
                  key={balance.user_id} 
                  className={`p-6 ${isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isPositive ? 'bg-gradient-to-br from-green-400 to-green-500' :
                        isNegative ? 'bg-gradient-to-br from-red-400 to-red-500' :
                        'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <span className="text-white font-bold text-lg">
                          {balance.user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {balance.user_name}
                          </h4>
                          {isCurrentUser && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Du
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            💳 Gezahlt: <strong>
                              {new Intl.NumberFormat('de-DE', { 
                                style: 'currency', 
                                currency: currentTrip.currency 
                              }).format(balance.paid)}
                            </strong>
                          </span>
                          <span>
                            📊 Anteil: <strong>
                              {new Intl.NumberFormat('de-DE', { 
                                style: 'currency', 
                                currency: currentTrip.currency 
                              }).format(balance.owes)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        isPositive ? 'text-green-600' :
                        isNegative ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {isPositive && '+'}
                        {new Intl.NumberFormat('de-DE', { 
                          style: 'currency', 
                          currency: currentTrip.currency 
                        }).format(balance.balance)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {isPositive && '💰 Bekommt Geld'}
                        {isNegative && '📉 Schuldet Geld'}
                        {isBalanced && '✅ Ausgeglichen'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Optimized Transactions */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">🔄 Empfohlene Transaktionen</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Minimale Anzahl Überweisungen zum Ausgleich
                  </p>
                </div>
                <div className="text-sm bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-medium">
                  {transactions.length} {transactions.length === 1 ? 'Überweisung' : 'Überweisungen'}
                </div>
              </div>
            </div>

            <div className="divide-y">
              {transactions.map((transaction, index) => {
                const isInvolved = transaction.from === currentUser?.id || transaction.to === currentUser?.id
                const isSettled = settlements.some(
                  s => s.from_user_id === transaction.from && 
                       s.to_user_id === transaction.to && 
                       Math.abs(s.amount - transaction.amount) < 0.01
                )

                return (
                  <div 
                    key={`${transaction.from}-${transaction.to}`}
                    className={`p-6 ${isInvolved ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Step Number */}
                        <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>

                        {/* Transaction Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-lg">
                            <span className="font-semibold text-gray-900">
                              {transaction.fromName}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-semibold text-gray-900">
                              {transaction.toName}
                            </span>
                          </div>
                          {isInvolved && (
                            <div className="text-sm text-amber-700 mt-1">
                              {transaction.from === currentUser?.id && '📤 Du musst zahlen'}
                              {transaction.to === currentUser?.id && '📥 Du bekommst Geld'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount & Action */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-teal-600">
                            {new Intl.NumberFormat('de-DE', { 
                              style: 'currency', 
                              currency: currentTrip.currency 
                            }).format(transaction.amount)}
                          </div>
                        </div>

                        {isSettled ? (
                          <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center gap-2">
                            <span>✅</span>
                            <span>Beglichen</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => markAsSettled(transaction.from, transaction.to, transaction.amount)}
                            disabled={loadingAction}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
                          >
                            Als beglichen markieren
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Settlement History */}
        {settlements.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold">📜 Abrechnungs-Historie</h3>
            </div>

            <div className="divide-y">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="text-sm text-gray-900">
                          <strong>{settlement.from_user?.name}</strong>
                          {' → '}
                          <strong>{settlement.to_user?.name}</strong>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(settlement.settled_at).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {new Intl.NumberFormat('de-DE', { 
                        style: 'currency', 
                        currency: currentTrip.currency 
                      }).format(settlement.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Wie funktioniert die Abrechnung?</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li><strong>Saldo:</strong> Positive Zahl = du bekommst Geld zurück, Negative Zahl = du schuldest Geld</li>
            <li><strong>Optimiert:</strong> Minimale Anzahl Überweisungen für vollständigen Ausgleich</li>
            <li><strong>Beglichen:</strong> Markiere Transaktionen als erledigt wenn bezahlt</li>
          </ul>
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

  function renderTabContent() {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'trips': return renderTripsTab()
      case 'expenses': return renderExpensesTab()
      case 'itinerary': return renderPlaceholder('Reiseplan', '🗓️')
      case 'packing': return renderPlaceholder('Packliste', '🎒')
      case 'map': return renderPlaceholder('Karte', '🗺️')
      case 'friends': return renderTeamTab()
      case 'settlement': return renderSettlementTab()
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
