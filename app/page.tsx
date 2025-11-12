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

  // ========== EMOJI PICKER STATE ==========
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])

  const emojiCategories = {
    '🌍 Reise': ['🌍', '🌎', '🌏', '✈️', '🛫', '🛬', '🚁', '🛩️', '🚀', '🛸'],
    '🏖️ Urlaub': ['🏖️', '🏝️', '⛱️', '🏄', '🏊', '🤿', '⛵', '🚤', '⛴️', '🛳️', '🚢'],
    '🏔️ Natur': ['🏔️', '⛰️', '🗻', '🏕️', '⛺', '🌲', '🌳', '🌴', '🌵', '🌾', '🏞️', '🌅', '🌄', '🌠', '🌌'],
    '🏛️ Kultur': ['🏛️', '🏰', '🏯', '🗼', '🗽', '⛩️', '🕌', '🛕', '⛪', '💒', '🏤', '🏦', '🏛️'],
    '🍕 Essen': ['🍕', '🍝', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🍱', '🍜', '🍲', '🍛', '🍣', '🍤', '🥘', '🍳', '🥞'],
    '🎯 Aktivität': ['🎯', '🎨', '🎭', '🎪', '🎡', '🎢', '🎠', '🎰', '🎳', '🎮', '🎲', '🧩', '🎯'],
    '🚗 Transport': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️'],
    '🎒 Ausrüstung': ['🎒', '🧳', '💼', '👜', '🎓', '🧢', '👒', '🎩', '⛑️', '📷', '📸', '🔦', '🧭', '⏰', '⏱️', '⌚'],
    '🇩🇪 Europa': ['🇩🇪', '🇨🇭', '🇦🇹', '🇮🇹', '🇫🇷', '🇪🇸', '🇵🇹', '🇬🇷', '🇳🇱', '🇧🇪', '🇬🇧', '🇮🇪', '🇩🇰', '🇸🇪', '🇳🇴', '🇫🇮', '🇮🇸', '🇵🇱', '🇨🇿', '🇭🇺'],
    '🇺🇸 Amerika': ['🇺🇸', '🇨🇦', '🇲🇽', '🇧🇷', '🇦🇷', '🇨🇱', '🇨🇴', '🇵🇪', '🇨🇺', '🇩🇴'],
    '🇯🇵 Asien': ['🇯🇵', '🇨🇳', '🇰🇷', '🇹🇭', '🇻🇳', '🇮🇩', '🇵🇭', '🇸🇬', '🇲🇾', '🇮🇳', '🇦🇪', '🇮🇱'],
    '🇦🇺 Ozeanien': ['🇦🇺', '🇳🇿', '🇫🇯', '🇵🇬', '🇳🇨', '🇵🇫'],
    '🇿🇦 Afrika': ['🇿🇦', '🇪🇬', '🇲🇦', '🇰🇪', '🇹🇿', '🇳🇬', '🇬🇭', '🇪🇹', '🇹🇳', '🇩🇿']
  }

  const getAllEmojis = () => {
    return Object.values(emojiCategories).flat()
  }

  const getFilteredEmojis = () => {
    if (!emojiSearch) return emojiCategories

    const search = emojiSearch.toLowerCase()
    const filtered: { [key: string]: string[] } = {}

    Object.entries(emojiCategories).forEach(([category, emojis]) => {
      const matchingEmojis = emojis.filter(emoji => {
        // Search by emoji itself or category name
        return emoji.includes(search) || category.toLowerCase().includes(search)
      })
      if (matchingEmojis.length > 0) {
        filtered[category] = matchingEmojis
      }
    })

    return filtered
  }

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

  // ========== ITINERARY STATE ==========
  const [itineraryItems, setItineraryItems] = useState<any[]>([])
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [editingItineraryItem, setEditingItineraryItem] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [newItineraryItem, setNewItineraryItem] = useState({
    day: 1,
    time: '09:00',
    title: '',
    details: '',
    type: '🎯 Aktivität'
  })

  // ========== LOCATION AUTOCOMPLETE STATE (für Itinerary) ==========
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocations, setIsSearchingLocations] = useState(false)
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const itineraryTypes = [
    { id: '🍳 Frühstück', icon: '🍳', label: 'Frühstück' },
    { id: '🚗 Transport', icon: '🚗', label: 'Transport' },
    { id: '🎯 Aktivität', icon: '🎯', label: 'Aktivität' },
    { id: '🍕 Restaurant', icon: '🍕', label: 'Restaurant' },
    { id: '🏨 Check-in/out', icon: '🏨', label: 'Check-in/out' },
    { id: '🛍️ Shopping', icon: '🛍️', label: 'Shopping' },
    { id: '📸 Sehenswürdigkeit', icon: '📸', label: 'Sehenswürdigkeit' },
    { id: '💤 Pause', icon: '💤', label: 'Pause' },
    { id: '📝 Sonstiges', icon: '📝', label: 'Sonstiges' }
  ]

  // ========== MAP/LOCATION STATE ==========
  const [locations, setLocations] = useState<any[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    type: '🏨 Hotel',
    notes: ''
  })

  const locationTypes = [
    { id: '🏨 Hotel', icon: '🏨', label: 'Hotel/Unterkunft', color: '#3b82f6' },
    { id: '🍕 Restaurant', icon: '🍕', label: 'Restaurant/Café', color: '#f59e0b' },
    { id: '📸 Sehenswürdigkeit', icon: '📸', label: 'Sehenswürdigkeit', color: '#8b5cf6' },
    { id: '🎯 Aktivität', icon: '🎯', label: 'Aktivität', color: '#10b981' },
    { id: '🚗 Transport', icon: '🚗', label: 'Transport/Station', color: '#6366f1' },
    { id: '🛍️ Shopping', icon: '🛍️', label: 'Shopping', color: '#ec4899' },
    { id: '📍 Sonstiges', icon: '📍', label: 'Sonstiges', color: '#6b7280' }
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
      setShowEmojiPicker(false)
      setEmojiSearch('')
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
      await loadPendingInvitations(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const loadPendingInvitations = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:users!invited_by(name, email)
        `)
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      if (error) throw error
      setPendingInvitations(data || [])
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Möchtest du diese Einladung wirklich zurückziehen?')) return

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Einladung zurückgezogen!' })
      await loadPendingInvitations(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Möchtest du ${memberName} wirklich aus dem Trip entfernen?`)) return

    try {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Mitglied entfernt!' })
      await loadTripMembers(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('trip_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Rolle aktualisiert!' })
      await loadTripMembers(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const getMemberRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700'
      case 'admin':
        return 'bg-blue-100 text-blue-700'
      case 'member':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getMemberRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑 Owner'
      case 'admin':
        return '⭐ Admin'
      case 'member':
        return '👤 Mitglied'
      default:
        return role
    }
  }

  const canManageMembers = () => {
    if (!currentTrip || !tripMembers.length) return false
    
    const currentMember = tripMembers.find(m => m.user_id === currentUser?.id)
    return currentMember && (currentMember.role === 'owner' || currentMember.role === 'admin')
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

  // ========== ITINERARY FUNCTIONS ==========
  const loadItineraryItems = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('time', { ascending: true })

      if (error) throw error
      setItineraryItems(data || [])
      
      // Set selected day to first day with items, or day 1
      if (data && data.length > 0) {
        const uniqueDays = new Set(data.map(item => item.day))
        const days = Array.from(uniqueDays).sort((a, b) => a - b)
        setSelectedDay(days[0])
      }
    } catch (error) {
      console.error('Error loading itinerary items:', error)
    }
  }

  const createOrUpdateItineraryItem = async () => {
    if (!newItineraryItem.title.trim()) {
      setAuthMessage({ type: 'error', text: '❌ Bitte einen Titel eingeben!' })
      return
    }

    if (!currentTrip) {
      setAuthMessage({ type: 'error', text: '❌ Keine Reise ausgewählt!' })
      return
    }

    setLoadingAction(true)
    try {
      const itineraryData = {
        trip_id: currentTrip.id,
        day: newItineraryItem.day,
        time: newItineraryItem.time,
        title: newItineraryItem.title.trim(),
        details: newItineraryItem.details.trim(),
        type: newItineraryItem.type
      }

      if (editingItineraryItem) {
        const { error } = await supabase
          .from('itinerary_items')
          .update(itineraryData)
          .eq('id', editingItineraryItem.id)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Aktivität aktualisiert!' })
      } else {
        const { error } = await supabase
          .from('itinerary_items')
          .insert(itineraryData)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Aktivität hinzugefügt!' })
      }

      await loadItineraryItems(currentTrip.id)
      setShowItineraryModal(false)
      setEditingItineraryItem(null)
      setNewItineraryItem({
        day: selectedDay,
        time: '09:00',
        title: '',
        details: '',
        type: '🎯 Aktivität'
      })
      // Clear autocomplete state
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      if (locationSearchTimeout) {
        clearTimeout(locationSearchTimeout)
        setLocationSearchTimeout(null)
      }
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const deleteItineraryItem = async (itemId: string) => {
    if (!confirm('Möchtest du diese Aktivität wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Aktivität gelöscht!' })
      await loadItineraryItems(currentTrip.id)
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const getItineraryItemsForDay = (day: number) => {
    return itineraryItems
      .filter(item => item.day === day)
      .sort((a, b) => a.time.localeCompare(b.time))
  }

  const getTripDays = () => {
    if (!currentTrip || !currentTrip.start_date || !currentTrip.end_date) {
      return [1, 2, 3] // Default 3 days if no dates set
    }

    const start = new Date(currentTrip.start_date)
    const end = new Date(currentTrip.end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end day

    return Array.from({ length: diffDays }, (_, i) => i + 1)
  }

  const getDayDate = (day: number) => {
    if (!currentTrip || !currentTrip.start_date) return null
    
    const start = new Date(currentTrip.start_date)
    const dayDate = new Date(start)
    dayDate.setDate(start.getDate() + day - 1)
    
    return dayDate.toLocaleDateString('de-DE', { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  // ========== LOCATION/MAP FUNCTIONS ==========
  const loadLocations = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      setAuthMessage({ type: 'error', text: '❌ Bitte eine Adresse eingeben!' })
      return null
    }

    setIsGeocoding(true)
    try {
      // Using OpenStreetMap Nominatim for geocoding (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'TravelTrackerPro/1.0'
          }
        }
      )
      
      const data = await response.json()
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          display_name: data[0].display_name
        }
      } else {
        setAuthMessage({ type: 'error', text: '❌ Adresse nicht gefunden. Bitte genauer eingeben.' })
        return null
      }
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ Geocoding-Fehler: ${error.message}` })
      return null
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleGeocodeAddress = async () => {
    const result = await geocodeAddress(newLocation.address)
    if (result) {
      setNewLocation({
        ...newLocation,
        latitude: result.latitude,
        longitude: result.longitude
      })
      setAuthMessage({ type: 'success', text: '✅ Koordinaten gefunden!' })
    }
  }

  // ========== LOCATION AUTOCOMPLETE ==========
  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      return
    }

    setIsSearchingLocations(true)
    
    try {
      // Use OpenStreetMap Nominatim for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `limit=8&` +
        `addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TravelTrackerPro/1.0'
          }
        }
      )
      
      const data = await response.json()
      
      if (data && Array.isArray(data)) {
        const suggestions = data.map((item: any) => ({
          name: item.display_name.split(',')[0], // First part of address
          full_address: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          type: item.type,
          icon: getLocationIconFromType(item.type)
        }))
        
        setLocationSuggestions(suggestions)
        setShowLocationSuggestions(suggestions.length > 0)
      }
    } catch (error) {
      console.error('Location search error:', error)
      setLocationSuggestions([])
    } finally {
      setIsSearchingLocations(false)
    }
  }

  const getLocationIconFromType = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'hotel': '🏨',
      'hostel': '🏨',
      'guest_house': '🏨',
      'restaurant': '🍕',
      'cafe': '☕',
      'fast_food': '🍔',
      'bar': '🍷',
      'pub': '🍺',
      'attraction': '📸',
      'museum': '🏛️',
      'monument': '🗿',
      'castle': '🏰',
      'stadium': '🏟️',
      'park': '🌳',
      'beach': '🏖️',
      'airport': '✈️',
      'train_station': '🚂',
      'bus_station': '🚌',
      'subway': '🚇',
      'shop': '🛍️',
      'supermarket': '🛒',
      'mall': '🏬'
    }
    
    return typeMap[type] || '📍'
  }

  const handleLocationSelect = async (suggestion: any) => {
    // Update the title with the selected location name
    setNewItineraryItem({
      ...newItineraryItem,
      title: suggestion.name
    })
    
    // Close suggestions dropdown
    setShowLocationSuggestions(false)
    setLocationSuggestions([])
    
    // Determine location type based on itinerary type
    let locationType = '📍 Sonstiges'
    if (newItineraryItem.type.includes('Restaurant') || newItineraryItem.type.includes('Frühstück')) {
      locationType = '🍕 Restaurant'
    } else if (newItineraryItem.type.includes('Hotel') || newItineraryItem.type.includes('Check-in')) {
      locationType = '🏨 Hotel'
    } else if (newItineraryItem.type.includes('Sehenswürdigkeit')) {
      locationType = '📸 Sehenswürdigkeit'
    } else if (newItineraryItem.type.includes('Transport')) {
      locationType = '🚗 Transport'
    } else if (newItineraryItem.type.includes('Shopping')) {
      locationType = '🛍️ Shopping'
    } else if (newItineraryItem.type.includes('Aktivität')) {
      locationType = '🎯 Aktivität'
    }
    
    // Auto-save location to database
    try {
      const locationData = {
        trip_id: currentTrip.id,
        name: suggestion.name,
        address: suggestion.full_address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        type: locationType,
        notes: `Automatisch hinzugefügt von Reiseplan`
      }
      
      const { error } = await supabase
        .from('locations')
        .insert(locationData)
      
      if (!error) {
        // Reload locations to show on map
        await loadLocations()
        setAuthMessage({ 
          type: 'success', 
          text: `✅ "${suggestion.name}" auf Karte gespeichert!` 
        })
      }
    } catch (error) {
      console.error('Error auto-saving location:', error)
      // Don't show error to user - it's an optional feature
    }
  }

  const handleTitleChange = (value: string) => {
    setNewItineraryItem({
      ...newItineraryItem,
      title: value
    })
    
    // Clear existing timeout
    if (locationSearchTimeout) {
      clearTimeout(locationSearchTimeout)
    }
    
    // Set new timeout for search (debounce)
    if (value.trim().length >= 3) {
      const timeout = setTimeout(() => {
        searchLocations(value)
      }, 500) // Wait 500ms after user stops typing
      
      setLocationSearchTimeout(timeout)
    } else {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
    }
  }

  const createOrUpdateLocation = async () => {
    if (!newLocation.name.trim()) {
      setAuthMessage({ type: 'error', text: '❌ Bitte einen Namen eingeben!' })
      return
    }

    if (!newLocation.latitude || !newLocation.longitude) {
      setAuthMessage({ type: 'error', text: '❌ Bitte Koordinaten festlegen (Geocode-Button klicken)!' })
      return
    }

    if (!currentTrip) {
      setAuthMessage({ type: 'error', text: '❌ Keine Reise ausgewählt!' })
      return
    }

    setLoadingAction(true)
    try {
      const locationData = {
        trip_id: currentTrip.id,
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        type: newLocation.type,
        notes: newLocation.notes.trim()
      }

      if (editingLocation) {
        const { error } = await supabase
          .from('locations')
          .update(locationData)
          .eq('id', editingLocation.id)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Location aktualisiert!' })
      } else {
        const { error } = await supabase
          .from('locations')
          .insert(locationData)

        if (error) throw error
        setAuthMessage({ type: 'success', text: '✅ Location hinzugefügt!' })
      }

      await loadLocations(currentTrip.id)
      setShowLocationModal(false)
      setEditingLocation(null)
      setNewLocation({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        type: '🏨 Hotel',
        notes: ''
      })
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    } finally {
      setLoadingAction(false)
    }
  }

  const deleteLocation = async (locationId: string) => {
    if (!confirm('Möchtest du diese Location wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: '✅ Location gelöscht!' })
      await loadLocations(currentTrip.id)
      if (selectedLocation?.id === locationId) {
        setSelectedLocation(null)
      }
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  const getLocationsByType = () => {
    const grouped: { [key: string]: any[] } = {}
    
    locations.forEach(location => {
      if (!grouped[location.type]) {
        grouped[location.type] = []
      }
      grouped[location.type].push(location)
    })
    
    return grouped
  }
// Helper function for expenses
const getTotalExpenses = () => {
  return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
}

// 2️⃣ SCHRITT 2: Settlement-Berechnungsfunktionen hinzufügen
// Füge diese Funktionen NACH den anderen Helper-Funktionen ein (z.B. nach getLocationsByType):

// Berechne optimale Ausgleichszahlungen
const calculateSettlements = () => {
  if (!currentTrip || expenses.length === 0 || tripMembers.length === 0) {
    return []
  }

  // Initialize balances for each member
  const balances: { [key: string]: number } = {}
  tripMembers.forEach(member => {
    balances[member.user.name] = 0
  })

  // Calculate how much each person paid and owes
  expenses.forEach(expense => {
    const payer = expense.paid_by
    const amount = expense.amount
    const splitCount = expense.split_between.length

    if (splitCount === 0) return

    const sharePerPerson = amount / splitCount

    // Payer gets credit for paying
    balances[payer] = (balances[payer] || 0) + amount

    // Everyone in split_between owes their share
    expense.split_between.forEach((person: string) => {
      balances[person] = (balances[person] || 0) - sharePerPerson
    })
  })

  // Create list of debtors (negative balance) and creditors (positive balance)
  const debtors: Array<{ name: string; amount: number }> = []
  const creditors: Array<{ name: string; amount: number }> = []

  Object.entries(balances).forEach(([name, balance]) => {
    if (balance < -0.01) { // Debtor (owes money)
      debtors.push({ name, amount: Math.abs(balance) })
    } else if (balance > 0.01) { // Creditor (is owed money)
      creditors.push({ name, amount: balance })
    }
  })

  // Sort for optimal matching
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  // Calculate optimal transactions
  const transactions: Array<{ from: string; to: string; amount: number }> = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]

    const settleAmount = Math.min(debtor.amount, creditor.amount)

    if (settleAmount > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmount
      })
    }

    debtor.amount -= settleAmount
    creditor.amount -= settleAmount

    if (debtor.amount < 0.01) i++
    if (creditor.amount < 0.01) j++
  }

  return transactions
}

// Berechne Balance für eine Person
const getPersonBalance = (personName: string) => {
  let balance = 0

  expenses.forEach(expense => {
    const amount = expense.amount
    const splitCount = expense.split_between.length

    if (splitCount === 0) return

    const sharePerPerson = amount / splitCount

    // If this person paid
    if (expense.paid_by === personName) {
      balance += amount
    }

    // If this person owes
    if (expense.split_between.includes(personName)) {
      balance -= sharePerPerson
    }
  })

  return balance
}

// Berechne Gesamt-Statistiken
const getSettlementStats = () => {
  const stats = {
    totalPaid: 0,
    totalOwed: 0,
    totalSettled: 0,
    personStats: [] as Array<{
      name: string
      paid: number
      owed: number
      balance: number
    }>
  }

  tripMembers.forEach(member => {
    const name = member.user.name
    let paid = 0
    let owed = 0

    expenses.forEach(expense => {
      const amount = expense.amount
      const splitCount = expense.split_between.length

      if (splitCount === 0) return

      const sharePerPerson = amount / splitCount

      if (expense.paid_by === name) {
        paid += amount
      }

      if (expense.split_between.includes(name)) {
        owed += sharePerPerson
      }
    })

    const balance = paid - owed

    stats.personStats.push({
      name,
      paid,
      owed,
      balance
    })

    stats.totalPaid += paid
    stats.totalOwed += owed
  })

  return stats
}


  
  const getCenterCoordinates = () => {
    if (locations.length === 0) {
      // Default center (Europe)
      return { lat: 48.8566, lng: 2.3522 } // Paris
    }

    const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length
    const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length

    return { lat: avgLat, lng: avgLng }
  }

  // ========== EFFECT HOOKS ==========
  useEffect(() => {
    if (currentTrip) {
      loadTripMembers(currentTrip.id)
      loadExpenses(currentTrip.id)
      loadPackingItems(currentTrip.id)
      loadItineraryItems(currentTrip.id)
      loadLocations(currentTrip.id)
      loadPendingInvitations(currentTrip.id)
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
    const totalActivities = itineraryItems.length
    const tripDays = getTripDays()

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <span className="text-3xl">🗓️</span>
              <span className="text-sm text-gray-600">Reiseplan</span>
            </div>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <div className="text-sm text-gray-600 mt-1">
              Aktivitäten • {tripDays.length} Tage
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

  const renderItineraryTab = () => {
    if (!currentTrip) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Bitte wähle zuerst eine Reise aus</p>
        </div>
      )
    }

    const tripDays = getTripDays()
    const dayItems = getItineraryItemsForDay(selectedDay)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Reiseplan</h2>
          <button
            onClick={() => {
              setEditingItineraryItem(null)
              setNewItineraryItem({
                day: selectedDay,
                time: '09:00',
                title: '',
                details: '',
                type: '🎯 Aktivität'
              })
              setShowItineraryModal(true)
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + Aktivität hinzufügen
          </button>
        </div>

        {/* Day Selector */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tripDays.map(day => {
              const dayItemsCount = getItineraryItemsForDay(day).length
              const dayDate = getDayDate(day)
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-shrink-0 px-4 py-3 rounded-lg transition-all ${
                    selectedDay === day
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-sm font-semibold">Tag {day}</div>
                  {dayDate && (
                    <div className="text-xs opacity-80">{dayDate}</div>
                  )}
                  {dayItemsCount > 0 && (
                    <div className="text-xs mt-1">
                      {dayItemsCount} {dayItemsCount === 1 ? 'Aktivität' : 'Aktivitäten'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Timeline for selected day */}
        {dayItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">🗓️</span>
            <p className="text-gray-600 mb-4">Noch keine Aktivitäten für Tag {selectedDay}</p>
            <button
              onClick={() => {
                setEditingItineraryItem(null)
                setNewItineraryItem({
                  day: selectedDay,
                  time: '09:00',
                  title: '',
                  details: '',
                  type: '🎯 Aktivität'
                })
                setShowItineraryModal(true)
              }}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Erste Aktivität hinzufügen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayItems.map((item, index) => {
              const typeIcon = itineraryTypes.find(t => t.id === item.type)?.icon || '📝'
              
              return (
                <div key={item.id} className="bg-white rounded-lg shadow">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Time column */}
                      <div className="flex-shrink-0 text-center">
                        <div className="text-2xl font-bold text-teal-600">
                          {item.time}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {index + 1}. Aktivität
                        </div>
                      </div>

                      {/* Timeline connector */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-teal-600"></div>
                        {index < dayItems.length - 1 && (
                          <div className="w-0.5 h-full min-h-[60px] bg-teal-200"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{typeIcon}</span>
                              <h3 className="font-semibold text-lg">{item.title}</h3>
                            </div>
                            {item.details && (
                              <p className="text-gray-600 text-sm whitespace-pre-wrap">
                                {item.details}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                {item.type}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingItineraryItem(item)
                                setNewItineraryItem({
                                  day: item.day,
                                  time: item.time,
                                  title: item.title,
                                  details: item.details,
                                  type: item.type
                                })
                                setShowItineraryModal(true)
                              }}
                              className="p-2 hover:bg-gray-100 rounded"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteItineraryItem(item.id)}
                              className="p-2 hover:bg-red-100 rounded text-red-600"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Day Summary */}
        {dayItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <span className="font-semibold">{dayItems.length}</span> Aktivitäten geplant
              </div>
              <div>
                Von <span className="font-semibold">{dayItems[0]?.time}</span> bis{' '}
                <span className="font-semibold">{dayItems[dayItems.length - 1]?.time}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMapTab = () => {
    if (!currentTrip) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Bitte wähle zuerst eine Reise aus</p>
        </div>
      )
    }

    const groupedLocations = getLocationsByType()
    const center = getCenterCoordinates()

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Karte & Locations</h2>
          <button
            onClick={() => {
              setEditingLocation(null)
              setNewLocation({
                name: '',
                address: '',
                latitude: center.lat,
                longitude: center.lng,
                type: '🏨 Hotel',
                notes: ''
              })
              setShowLocationModal(true)
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + Location hinzufügen
          </button>
        </div>

        {/* Map Display (Simplified - using OpenStreetMap iframe) */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="relative" style={{ height: '500px' }}>
            {locations.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <span className="text-6xl mb-4 block">🗺️</span>
                  <p className="text-gray-600 mb-4">Noch keine Locations auf der Karte</p>
                  <button
                    onClick={() => {
                      setEditingLocation(null)
                      setNewLocation({
                        name: '',
                        address: '',
                        latitude: center.lat,
                        longitude: center.lng,
                        type: '🏨 Hotel',
                        notes: ''
                      })
                      setShowLocationModal(true)
                    }}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    Erste Location hinzufügen
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full">
                {/* Simple static map with markers */}
                <div className="relative h-full bg-gray-100">
                  {/* Map Info */}
                  <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
                    <h3 className="font-semibold mb-2">📍 {locations.length} Locations</h3>
                    <p className="text-sm text-gray-600">
                      Zentrum: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                    </p>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=12/${center.lat}/${center.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-700 mt-2 inline-block"
                    >
                      🗺️ In OpenStreetMap öffnen →
                    </a>
                  </div>

                  {/* Embedded OpenStreetMap */}
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng-0.1},${center.lat-0.1},${center.lng+0.1},${center.lat+0.1}&layer=mapnik&marker=${center.lat},${center.lng}`}
                    style={{ border: 0 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Locations List by Type */}
        {locations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedLocations).map(([type, locs]) => {
              const typeInfo = locationTypes.find(t => t.id === type)
              const icon = typeInfo?.icon || '📍'
              const color = typeInfo?.color || '#6b7280'

              return (
                <div key={type} className="bg-white rounded-lg shadow">
                  <div 
                    className="p-4 border-b flex items-center gap-2"
                    style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                  >
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <h3 className="font-semibold">{typeInfo?.label || type}</h3>
                      <p className="text-sm text-gray-600">{locs.length} Location(s)</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {locs.map((location) => (
                      <div
                        key={location.id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedLocation(location)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{location.name}</h4>
                            {location.address && (
                              <p className="text-sm text-gray-600 mt-1">
                                📍 {location.address}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingLocation(location)
                                setNewLocation({
                                  name: location.name,
                                  address: location.address || '',
                                  latitude: location.latitude,
                                  longitude: location.longitude,
                                  type: location.type,
                                  notes: location.notes || ''
                                })
                                setShowLocationModal(true)
                              }}
                              className="p-1 hover:bg-white rounded"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteLocation(location.id)
                              }}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        {location.notes && (
                          <p className="text-sm text-gray-600 mt-2 pt-2 border-t">
                            💬 {location.notes}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <a
                            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Google Maps →
                          </a>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:text-green-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            OpenStreetMap →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Selected Location Details Modal */}
        {selectedLocation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {locationTypes.find(t => t.id === selectedLocation.type)?.icon || '📍'}
                    {selectedLocation.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {locationTypes.find(t => t.id === selectedLocation.type)?.label}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {selectedLocation.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Adresse:</p>
                    <p className="text-sm">{selectedLocation.address}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-600">Koordinaten:</p>
                  <p className="text-sm font-mono">
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>

                {selectedLocation.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Notizen:</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedLocation.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  <a
                    href={`https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Google Maps öffnen
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedLocation.latitude}&mlon=${selectedLocation.longitude}#map=16/${selectedLocation.latitude}/${selectedLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 text-sm"
                  >
                    OpenStreetMap öffnen
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTeamTab = () => {
    if (!currentTrip) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Bitte wähle zuerst eine Reise aus</p>
        </div>
      )
    }

    const currentMember = tripMembers.find(m => m.user_id === currentUser?.id)
    const isOwnerOrAdmin = currentMember && (currentMember.role === 'owner' || currentMember.role === 'admin')

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Team-Verwaltung</h2>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              + Mitglied einladen
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">👥</span>
              <span className="text-sm text-gray-600">Mitglieder</span>
            </div>
            <div className="text-2xl font-bold">{tripMembers.length}</div>
            <div className="text-sm text-gray-600 mt-1">
              Aktive Teilnehmer
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">📧</span>
              <span className="text-sm text-gray-600">Einladungen</span>
            </div>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
            <div className="text-sm text-gray-600 mt-1">
              Ausstehend
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">⭐</span>
              <span className="text-sm text-gray-600">Admins</span>
            </div>
            <div className="text-2xl font-bold">
              {tripMembers.filter(m => m.role === 'owner' || m.role === 'admin').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Verwalter
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-lg">Team-Mitglieder</h3>
          </div>
          <div className="p-6">
            {tripMembers.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">👥</span>
                <p className="text-gray-600">Noch keine Mitglieder</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tripMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {member.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>

                      {/* User Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.user?.name || 'Unknown'}</span>
                          {member.user_id === currentUser?.id && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                              Du
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{member.user?.email}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Beigetreten: {new Date(member.joined_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>

                    {/* Role & Actions */}
                    <div className="flex items-center gap-3">
                      {/* Role Badge */}
                      {isOwnerOrAdmin && member.user_id !== currentUser?.id && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value)}
                          className={`px-3 py-1 rounded text-sm font-medium ${getMemberRoleBadgeColor(member.role)}`}
                        >
                          <option value="admin">⭐ Admin</option>
                          <option value="member">👤 Mitglied</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getMemberRoleBadgeColor(member.role)}`}>
                          {getMemberRoleLabel(member.role)}
                        </span>
                      )}

                      {/* Remove Button */}
                      {isOwnerOrAdmin && member.user_id !== currentUser?.id && member.role !== 'owner' && (
                        <button
                          onClick={() => removeMember(member.id, member.user?.name || 'Mitglied')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Mitglied entfernen"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Invitations */}
        {isOwnerOrAdmin && pendingInvitations.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="font-semibold text-lg">Ausstehende Einladungen</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{invitation.invited_email}</div>
                      <div className="text-sm text-gray-600">
                        Eingeladen von: {invitation.inviter?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Läuft ab: {new Date(invitation.expires_at).toLocaleDateString('de-DE')}
                      </div>
                      <div className="text-xs text-gray-500">
                        Token: {invitation.token.substring(0, 20)}...
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                        ⏳ Ausstehend
                      </span>
                      <button
                        onClick={() => cancelInvitation(invitation.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Einladung zurückziehen"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Team-Rollen:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>👑 Owner:</strong> Vollzugriff, kann nicht entfernt werden</li>
            <li>• <strong>⭐ Admin:</strong> Kann Mitglieder einladen und verwalten</li>
            <li>• <strong>👤 Mitglied:</strong> Kann Trip anzeigen und bearbeiten</li>
          </ul>
        </div>

        {!isOwnerOrAdmin && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              💡 Du hast eingeschränkte Berechtigungen. Kontaktiere einen Admin, um Mitglieder zu verwalten.
            </p>
          </div>
        )}
      </div>
    )
  }
// Füge diese Funktion VOR renderTabContent() ein (z.B. nach renderAdminTab):

const renderSettlementTab = () => {
  if (!currentTrip) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Bitte wähle zuerst eine Reise aus</p>
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <span className="text-6xl mb-4 block">💳</span>
        <p className="text-gray-600 mb-2">Noch keine Ausgaben vorhanden</p>
        <p className="text-sm text-gray-500">Füge zuerst Ausgaben hinzu, um Abrechnungen zu sehen</p>
      </div>
    )
  }

  const settlements = calculateSettlements()
  const stats = getSettlementStats()
  const totalExpenses = getTotalExpenses()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Abrechnung & Ausgleich</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingExpense(null)
              setNewExpense({
                category: '🍕 Essen & Trinken',
                description: '',
                amount: '',
                paid_by: currentUser?.name || '',
                split_between: tripMembers.map(m => m.user.name),
                date: new Date().toISOString().split('T')[0]
              })
              setShowExpenseModal(true)
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            💰 Ausgabe hinzufügen
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">💰</span>
            <span className="text-sm text-gray-600">Gesamt</span>
          </div>
          <div className="text-2xl font-bold">{totalExpenses.toFixed(2)} {currentTrip.currency}</div>
          <div className="text-sm text-gray-600 mt-1">
            {expenses.length} Ausgaben
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">👥</span>
            <span className="text-sm text-gray-600">Teilnehmer</span>
          </div>
          <div className="text-2xl font-bold">{tripMembers.length}</div>
          <div className="text-sm text-gray-600 mt-1">
            Pro Person: {(totalExpenses / tripMembers.length).toFixed(2)} {currentTrip.currency}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🔄</span>
            <span className="text-sm text-gray-600">Transaktionen</span>
          </div>
          <div className="text-2xl font-bold">{settlements.length}</div>
          <div className="text-sm text-gray-600 mt-1">
            Zum Ausgleich nötig
          </div>
        </div>
      </div>

      {/* Settlement Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">💳 Ausgleichszahlungen</h3>
              <p className="text-sm text-gray-600 mt-1">
                Optimierte Zahlungen um alle Schulden auszugleichen
              </p>
            </div>
            {settlements.length === 0 && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                ✅ Alles ausgeglichen!
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          {settlements.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">🎉</span>
              <p className="text-lg font-semibold text-gray-900 mb-2">Perfekt ausgeglichen!</p>
              <p className="text-gray-600">Alle Ausgaben sind fair verteilt. Keine Zahlungen nötig.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settlements.map((transaction, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* From Person */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                          {transaction.from.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{transaction.from}</div>
                          <div className="text-xs text-gray-500">Zahlt</div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <div className="text-2xl">→</div>
                          <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold mt-1">
                            {transaction.amount.toFixed(2)} {currentTrip.currency}
                          </div>
                        </div>
                      </div>

                      {/* To Person */}
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-right">{transaction.to}</div>
                          <div className="text-xs text-gray-500 text-right">Erhält</div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                          {transaction.to.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personal Balances */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">👤 Persönliche Übersicht</h3>
          <p className="text-sm text-gray-600 mt-1">
            Wer hat wie viel gezahlt und wer schuldet wie viel
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {stats.personStats
              .sort((a, b) => b.balance - a.balance)
              .map(person => {
                const isPositive = person.balance > 0.01
                const isNegative = person.balance < -0.01
                const isBalanced = !isPositive && !isNegative

                return (
                  <div
                    key={person.name}
                    className={`p-4 rounded-lg border-2 ${
                      isPositive
                        ? 'bg-green-50 border-green-200'
                        : isNegative
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          isPositive
                            ? 'bg-gradient-to-br from-green-400 to-teal-500'
                            : isNegative
                            ? 'bg-gradient-to-br from-red-400 to-orange-500'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {person.name}
                            {person.name === currentUser?.name && (
                              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                                Du
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Gezahlt: <strong>{person.paid.toFixed(2)} {currentTrip.currency}</strong> • 
                            Anteil: <strong>{person.owed.toFixed(2)} {currentTrip.currency}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          isPositive
                            ? 'text-green-600'
                            : isNegative
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}>
                          {isPositive ? '+' : ''}{person.balance.toFixed(2)} {currentTrip.currency}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {isPositive ? '✅ Bekommt zurück' : isNegative ? '❌ Schuldet' : '✅ Ausgeglichen'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ So funktioniert die Abrechnung:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Alle Ausgaben werden fair nach der Split-Verteilung aufgeteilt</li>
          <li>• Positive Beträge bedeuten: Diese Person hat mehr gezahlt und bekommt Geld zurück</li>
          <li>• Negative Beträge bedeuten: Diese Person schuldet noch Geld</li>
          <li>• Die Ausgleichszahlungen sind optimal minimiert (wenige Transaktionen)</li>
        </ul>
      </div>
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

// 1️⃣ SCHRITT 1: Settlement-Tab in renderTabContent() hinzufügen
// Ersetze in der renderTabContent() Funktion (Zeile ~2500):

const renderTabContent = () => {
  switch (activeTab) {
    case 'overview':
      return renderOverview()
    case 'trips':
      return renderTripsTab()
    case 'expenses':
      return renderExpensesTab()
    case 'itinerary':
      return renderItineraryTab()
    case 'packing':
      return renderPackingTab()
    case 'map':
      return renderMapTab()
    case 'friends':
      return renderTeamTab()
    case 'settlement':  // ⬅️ NEU HINZUFÜGEN!
      return renderSettlementTab()  // ⬅️ NEU HINZUFÜGEN!
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
              <label className="block text-sm font-medium mb-2">Icon/Emojis</label>
              
              {/* Selected Emojis Display */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 px-4 py-3 border rounded-lg bg-gray-50 flex items-center gap-2 min-h-[50px]">
                  {newTripData.flag ? (
                    <span className="text-3xl">{newTripData.flag}</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Wähle Emojis...</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                >
                  😊 {showEmojiPicker ? 'Schließen' : 'Auswählen'}
                </button>
                {newTripData.flag && (
                  <button
                    type="button"
                    onClick={() => setNewTripData({...newTripData, flag: ''})}
                    className="px-3 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    title="Alle löschen"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="border rounded-lg bg-white shadow-lg max-h-96 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b sticky top-0 bg-white">
                    <input
                      type="text"
                      placeholder="🔍 Suche Emojis..."
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Emoji Categories */}
                  <div className="overflow-y-auto max-h-80 p-3">
                    {Object.entries(getFilteredEmojis()).map(([category, emojis]) => (
                      <div key={category} className="mb-4">
                        <div className="text-xs font-semibold text-gray-600 mb-2">{category}</div>
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setNewTripData({...newTripData, flag: newTripData.flag + emoji})
                              }}
                              className="text-2xl p-2 rounded hover:bg-gray-100 transition-colors"
                              title="Hinzufügen"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(getFilteredEmojis()).length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <span className="text-4xl mb-2 block">🔍</span>
                        <p className="text-sm">Keine Emojis gefunden</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                setShowEmojiPicker(false)
                setEmojiSearch('')
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
              <label className="block text-sm font-medium mb-2">Icon/Emojis</label>
              
              {/* Selected Emojis Display */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 px-4 py-3 border rounded-lg bg-gray-50 flex items-center gap-2 min-h-[50px]">
                  {editingTrip.flag ? (
                    <span className="text-3xl">{editingTrip.flag}</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Wähle Emojis...</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                >
                  😊 {showEmojiPicker ? 'Schließen' : 'Auswählen'}
                </button>
                {editingTrip.flag && (
                  <button
                    type="button"
                    onClick={() => setEditingTrip({...editingTrip, flag: ''})}
                    className="px-3 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    title="Alle löschen"
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="border rounded-lg bg-white shadow-lg max-h-96 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b sticky top-0 bg-white">
                    <input
                      type="text"
                      placeholder="🔍 Suche Emojis..."
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Emoji Categories */}
                  <div className="overflow-y-auto max-h-80 p-3">
                    {Object.entries(getFilteredEmojis()).map(([category, emojis]) => (
                      <div key={category} className="mb-4">
                        <div className="text-xs font-semibold text-gray-600 mb-2">{category}</div>
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setEditingTrip({...editingTrip, flag: editingTrip.flag + emoji})
                              }}
                              className="text-2xl p-2 rounded hover:bg-gray-100 transition-colors"
                              title="Hinzufügen"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(getFilteredEmojis()).length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <span className="text-4xl mb-2 block">🔍</span>
                        <p className="text-sm">Keine Emojis gefunden</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                setShowEmojiPicker(false)
                setEmojiSearch('')
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

  const renderItineraryModal = () => {
    if (!showItineraryModal) return null

    const tripDays = getTripDays()

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">
            {editingItineraryItem ? 'Aktivität bearbeiten' : 'Neue Aktivität'}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tag *</label>
                <select
                  value={newItineraryItem.day}
                  onChange={(e) => setNewItineraryItem({...newItineraryItem, day: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  {tripDays.map(day => {
                    const dayDate = getDayDate(day)
                    return (
                      <option key={day} value={day}>
                        Tag {day} {dayDate ? `(${dayDate})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Uhrzeit *</label>
                <input 
                  type="time"
                  value={newItineraryItem.time}
                  onChange={(e) => setNewItineraryItem({...newItineraryItem, time: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Typ</label>
              <select
                value={newItineraryItem.type}
                onChange={(e) => setNewItineraryItem({...newItineraryItem, type: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {itineraryTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Titel * {isSearchingLocations && '🔍'}</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="z.B. Hotel Schweizerhof oder Frühstück im Hotel"
                  value={newItineraryItem.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onFocus={() => {
                    // Show suggestions if we have any
                    if (locationSuggestions.length > 0) {
                      setShowLocationSuggestions(true)
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
                
                {/* Autocomplete Dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 bg-gray-50 border-b text-xs text-gray-600 flex items-center gap-2">
                      <span>📍</span>
                      <span>Locations gefunden - klicke zum Auswählen & automatisch auf Karte speichern</span>
                    </div>
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleLocationSelect(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">{suggestion.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {suggestion.name}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {suggestion.full_address}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 Tipp: Gib einen Ort ein (z.B. "Schweizerhof Genf") und wir finden automatisch die Location
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Details/Notizen</label>
              <textarea 
                placeholder="Optionale Details zur Aktivität..."
                value={newItineraryItem.details}
                onChange={(e) => setNewItineraryItem({...newItineraryItem, details: e.target.value})}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowItineraryModal(false)
                setEditingItineraryItem(null)
                setNewItineraryItem({
                  day: selectedDay,
                  time: '09:00',
                  title: '',
                  details: '',
                  type: '🎯 Aktivität'
                })
                // Clear autocomplete state
                setLocationSuggestions([])
                setShowLocationSuggestions(false)
                if (locationSearchTimeout) {
                  clearTimeout(locationSearchTimeout)
                  setLocationSearchTimeout(null)
                }
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={createOrUpdateItineraryItem}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Speichere...' : (editingItineraryItem ? 'Aktualisieren' : 'Hinzufügen')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderLocationModal = () => {
    if (!showLocationModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">
            {editingLocation ? 'Location bearbeiten' : 'Neue Location'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Typ</label>
              <select
                value={newLocation.type}
                onChange={(e) => setNewLocation({...newLocation, type: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {locationTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input 
                type="text"
                placeholder="z.B. Hotel Colosseo"
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Adresse</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="z.B. Via Cavour 35, Rom"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={handleGeocodeAddress}
                  disabled={isGeocoding || !newLocation.address.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isGeocoding ? '...' : '🌍 Geocode'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Geocode findet automatisch die Koordinaten
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Breitengrad *</label>
                <input 
                  type="number"
                  step="any"
                  placeholder="z.B. 41.8902"
                  value={newLocation.latitude || ''}
                  onChange={(e) => setNewLocation({...newLocation, latitude: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Längengrad *</label>
                <input 
                  type="number"
                  step="any"
                  placeholder="z.B. 12.4922"
                  value={newLocation.longitude || ''}
                  onChange={(e) => setNewLocation({...newLocation, longitude: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notizen</label>
              <textarea 
                placeholder="Optionale Notizen zur Location..."
                value={newLocation.notes}
                onChange={(e) => setNewLocation({...newLocation, notes: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {newLocation.latitude !== 0 && newLocation.longitude !== 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📍 Koordinaten gesetzt: {newLocation.latitude.toFixed(4)}, {newLocation.longitude.toFixed(4)}
                </p>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${newLocation.latitude}&mlon=${newLocation.longitude}#map=16/${newLocation.latitude}/${newLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block"
                >
                  Auf Karte ansehen →
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowLocationModal(false)
                setEditingLocation(null)
                setNewLocation({
                  name: '',
                  address: '',
                  latitude: 0,
                  longitude: 0,
                  type: '🏨 Hotel',
                  notes: ''
                })
              }}
              className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button 
              onClick={createOrUpdateLocation}
              disabled={loadingAction}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
            >
              {loadingAction ? 'Speichere...' : (editingLocation ? 'Aktualisieren' : 'Hinzufügen')}
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
      {renderItineraryModal()}
      {renderPackingModal()}
      {renderLocationModal()}
    </div>
  )
}
