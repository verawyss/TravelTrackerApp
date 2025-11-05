'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TravelTracker() {
  // ========== ORIGINAL STATES ==========
  const [activeTab, setActiveTab] = useState('overview')
  const [expenses, setExpenses] = useState<any[]>([])
  const [itineraryItems, setItineraryItems] = useState<any[]>([])
  const [packingLists, setPackingLists] = useState<any[]>([])
  const [currentTrip, setCurrentTrip] = useState<any>(null)
  const [settlements, setSettlements] = useState<any[]>([])
  
  // Demo User
  const currentUser = {
    id: 'demo-user-1',
    email: 'max@example.com',
    name: 'Max Mustermann',
    role: 'admin'
  }

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
    paid_by: 'Max',
    split_between: ['Max', 'Anna', 'Tom']
  })

  const [newActivity, setNewActivity] = useState({
    day: 1,
    time: '10:00',
    title: '',
    details: '',
    type: 'Aktivität'
  })

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    await loadAllTrips()
    if (!currentTrip) {
      // Demo-Daten nur wenn keine Reise existiert
      loadDemoData()
    }
  }

  const loadDemoData = () => {
    const demoTrip = {
      id: 'demo-trip-1',
      name: 'Barcelona Städtetrip',
      destination: 'Barcelona, Spanien',
      flag: '🇪🇸',
      start_date: '2024-06-15',
      end_date: '2024-06-22',
      budget: 2000,
      currency: 'EUR',
      status: 'active',
      created_by: currentUser.id
    }
    
    setCurrentTrip(demoTrip)
    setAllUserTrips([demoTrip])

    setExpenses([
      { id: 1, trip_id: demoTrip.id, category: 'Unterkunft', description: 'Hotel Gothic Quarter', amount: 450, paid_by: 'Max', split_between: ['Max', 'Anna', 'Tom'], date: '2024-06-15' },
      { id: 2, trip_id: demoTrip.id, category: 'Transport', description: 'Flüge Zürich-Barcelona', amount: 380, paid_by: 'Anna', split_between: ['Max', 'Anna', 'Tom'], date: '2024-06-15' },
      { id: 3, trip_id: demoTrip.id, category: 'Essen', description: 'Dinner im Cervecería', amount: 75, paid_by: 'Tom', split_between: ['Max', 'Anna', 'Tom'], date: '2024-06-16' },
      { id: 4, trip_id: demoTrip.id, category: 'Aktivitäten', description: 'Sagrada Familia Tickets', amount: 90, paid_by: 'Max', split_between: ['Max', 'Anna', 'Tom'], date: '2024-06-17' }
    ])

    setItineraryItems([
      { id: 1, trip_id: demoTrip.id, day: 1, time: '10:00', title: 'Ankunft & Check-in', details: 'Hotel Gothic Quarter', type: 'Check-in' },
      { id: 2, trip_id: demoTrip.id, day: 1, time: '14:00', title: 'Las Ramblas', details: 'Spaziergang durch die berühmte Straße', type: 'Aktivität' },
      { id: 3, trip_id: demoTrip.id, day: 2, time: '09:00', title: 'Sagrada Familia', details: 'Tickets vorbestellt', type: 'Sehenswürdigkeit' },
      { id: 4, trip_id: demoTrip.id, day: 2, time: '15:00', title: 'Park Güell', details: 'Gaudí Park', type: 'Sehenswürdigkeit' }
    ])

    setPackingLists([
      { id: 1, trip_id: demoTrip.id, category: 'Kleidung', item: 'T-Shirts (5x)', packed: true },
      { id: 2, trip_id: demoTrip.id, category: 'Kleidung', item: 'Shorts/Hosen', packed: true },
      { id: 3, trip_id: demoTrip.id, category: 'Dokumente', item: 'Reisepass', packed: false },
      { id: 4, trip_id: demoTrip.id, category: 'Elektronik', item: 'Smartphone + Ladekabel', packed: false }
    ])

    setTripMembers([
      { id: 1, trip_id: demoTrip.id, user_id: 'demo-user-1', role: 'owner', user: { name: 'Max Mustermann', email: 'max@example.com' } },
      { id: 2, trip_id: demoTrip.id, user_id: 'demo-user-2', role: 'admin', user: { name: 'Anna Schmidt', email: 'anna@example.com' } },
      { id: 3, trip_id: demoTrip.id, user_id: 'demo-user-3', role: 'member', user: { name: 'Tom Müller', email: 'tom@example.com' } }
    ])

    calculateSettlements()
  }

  // ========== V2 FUNCTIONS ==========

  // Alle User-Reisen laden
  const loadAllTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, trip_members(*)')
        .eq('created_by', currentUser.id)
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

  // Trip-Daten laden
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

  // Neue Reise erstellen
  const createNewTrip = async () => {
    if (!newTripData.name || !newTripData.destination) {
      alert('❌ Bitte Name und Ziel eingeben!')
      return
    }

    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          ...newTripData,
          status: 'active',
          created_by: currentUser.id
        })
        .select()
        .single()

      if (tripError) throw tripError

      // User als Owner hinzufügen
      await supabase.from('trip_members').insert({
        trip_id: tripData.id,
        user_id: currentUser.id,
        role: 'owner'
      })

      setShowNewTripModal(false)
      setNewTripData({
        name: '',
        destination: '',
        flag: '🌍',
        start_date: '',
        end_date: '',
        budget: 0,
        currency: 'EUR'
      })
      setCurrentTrip(tripData)
      await loadAllTrips()
      alert('✅ Reise erstellt!')
    } catch (error) {
      alert('❌ Fehler: ' + (error as Error).message)
    }
  }

  // Ausgabe hinzufügen
  const createExpense = async () => {
    if (!currentTrip || !newExpense.description || newExpense.amount <= 0) {
      alert('❌ Bitte alle Felder ausfüllen!')
      return
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          trip_id: currentTrip.id,
          ...newExpense,
          date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) throw error

      setExpenses([...expenses, data])
      setShowAddExpenseModal(false)
      setNewExpense({
        category: 'Sonstiges',
        description: '',
        amount: 0,
        paid_by: 'Max',
        split_between: ['Max', 'Anna', 'Tom']
      })
      calculateSettlements()
      alert('✅ Ausgabe hinzugefügt!')
    } catch (error) {
      alert('❌ Fehler: ' + (error as Error).message)
    }
  }

  // Aktivität hinzufügen
  const createActivity = async () => {
    if (!currentTrip || !newActivity.title) {
      alert('❌ Bitte Titel eingeben!')
      return
    }

    try {
      const { data, error } = await supabase
        .from('itinerary')
        .insert({
          trip_id: currentTrip.id,
          ...newActivity
        })
        .select()
        .single()

      if (error) throw error

      setItineraryItems([...itineraryItems, data])
      setShowAddActivityModal(false)
      setNewActivity({
        day: 1,
        time: '10:00',
        title: '',
        details: '',
        type: 'Aktivität'
      })
      alert('✅ Aktivität hinzugefügt!')
    } catch (error) {
      alert('❌ Fehler: ' + (error as Error).message)
    }
  }

  // Einladung senden
  const sendInvitation = async () => {
    if (!currentTrip || !inviteEmail.includes('@')) {
      alert('❌ Bitte gültige E-Mail eingeben!')
      return
    }

    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      const { error } = await supabase.from('invitations').insert({
        trip_id: currentTrip.id,
        invited_by: currentUser.id,
        invited_email: inviteEmail,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      })

      if (error) throw error

      const link = `${window.location.origin}/invite/${token}`
      await navigator.clipboard.writeText(link)
      
      alert(`✅ Einladung erstellt!\n\n📋 Link kopiert:\n${link}`)
      setShowInviteModal(false)
      setInviteEmail('')
    } catch (error) {
      alert('❌ Fehler: ' + (error as Error).message)
    }
  }

  // Ort hinzufügen
  const addLocation = async () => {
    if (!currentTrip || !newLocation.name || !newLocation.address) {
      alert('❌ Bitte Name und Adresse eingeben!')
      return
    }

    try {
      const coords = await geocodeAddress(newLocation.address)
      if (!coords) {
        alert('❌ Adresse nicht gefunden!')
        return
      }

      const { data, error } = await supabase
        .from('locations')
        .insert({
          trip_id: currentTrip.id,
          name: newLocation.name,
          address: newLocation.address,
          latitude: coords.lat,
          longitude: coords.lng,
          type: newLocation.type,
          notes: newLocation.notes
        })
        .select()
        .single()

      if (error) throw error

      setLocations([...locations, data])
      setShowAddLocationModal(false)
      setNewLocation({
        name: '',
        address: '',
        type: 'activity',
        notes: ''
      })
      alert('✅ Ort hinzugefügt!')
    } catch (error) {
      alert('❌ Fehler: ' + (error as Error).message)
    }
  }

  // Geocoding Helper
  async function geocodeAddress(address: string) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      )
      const data = await res.json()
      return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null
    } catch {
      return null
    }
  }

  // ========== HELPER FUNCTIONS ==========

  const calculateSettlements = () => {
    if (expenses.length === 0) return

    const balances: { [key: string]: number } = {}
    
    expenses.forEach(expense => {
      const splitAmount = expense.amount / expense.split_between.length
      
      if (!balances[expense.paid_by]) balances[expense.paid_by] = 0
      balances[expense.paid_by] += expense.amount
      
      expense.split_between.forEach((person: string) => {
        if (!balances[person]) balances[person] = 0
        balances[person] -= splitAmount
      })
    })

    const newSettlements: any[] = []
    const people = Object.keys(balances)
    
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const person1 = people[i]
        const person2 = people[j]
        const balance1 = balances[person1]
        const balance2 = balances[person2]
        
        if (balance1 > 0 && balance2 < 0) {
          const amount = Math.min(balance1, Math.abs(balance2))
          newSettlements.push({ from: person2, to: person1, amount })
          balances[person1] -= amount
          balances[person2] += amount
        } else if (balance1 < 0 && balance2 > 0) {
          const amount = Math.min(Math.abs(balance1), balance2)
          newSettlements.push({ from: person1, to: person2, amount })
          balances[person1] += amount
          balances[person2] -= amount
        }
      }
    }

    setSettlements(newSettlements)
  }

  const getExpenseIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Unterkunft': '🏨',
      'Transport': '✈️',
      'Essen': '🍽️',
      'Aktivitäten': '🎭',
      'Shopping': '🛍️',
      'Sonstiges': '💰'
    }
    return icons[category] || '💰'
  }

  const getActivityTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'Check-in': '🏨',
      'Check-out': '🚪',
      'Aktivität': '🎯',
      'Sehenswürdigkeit': '🏛️',
      'Restaurant': '🍽️',
      'Transport': '🚗',
      'Freizeit': '🎉'
    }
    return icons[type] || '📍'
  }

  // ========== RENDER FUNCTIONS ==========

  const renderOverview = () => {
    if (!currentTrip) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-6">🌍</div>
          <h2 className="text-2xl font-bold mb-4">Willkommen bei TravelTracker Pro!</h2>
          <p className="text-gray-600 mb-8">Du hast noch keine aktive Reise. Erstelle deine erste Reise, um loszulegen!</p>
          <button 
            onClick={() => setShowNewTripModal(true)}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            ✈️ Neue Reise erstellen
          </button>
        </div>
      )
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const daysSinceStart = currentTrip.start_date 
      ? Math.floor((new Date().getTime() - new Date(currentTrip.start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-8 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{currentTrip.flag}</span>
            <div>
              <h2 className="text-3xl font-bold">{currentTrip.name}</h2>
              <p className="text-teal-100">{currentTrip.destination}</p>
            </div>
          </div>
          <div className="flex gap-8 mt-6">
            <div>
              <div className="text-teal-100 text-sm">Start</div>
              <div className="text-xl font-semibold">{new Date(currentTrip.start_date).toLocaleDateString('de-DE')}</div>
            </div>
            <div>
              <div className="text-teal-100 text-sm">Ende</div>
              <div className="text-xl font-semibold">{new Date(currentTrip.end_date).toLocaleDateString('de-DE')}</div>
            </div>
            <div>
              <div className="text-teal-100 text-sm">Tage</div>
              <div className="text-xl font-semibold">{Math.ceil((new Date(currentTrip.end_date).getTime() - new Date(currentTrip.start_date).getTime()) / (1000 * 60 * 60 * 24))}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">💰</span>
              <h3 className="text-lg font-semibold text-gray-900">Ausgaben</h3>
            </div>
            <div className="text-3xl font-bold text-teal-600">{totalExpenses.toFixed(2)} {currentTrip.currency}</div>
            <div className="text-sm text-gray-500 mt-1">{expenses.length} Transaktionen</div>
            {currentTrip.budget > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Budget</span>
                  <span>{((totalExpenses / currentTrip.budget) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${totalExpenses > currentTrip.budget ? 'bg-red-500' : 'bg-teal-600'}`}
                    style={{ width: `${Math.min((totalExpenses / currentTrip.budget) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🗓️</span>
              <h3 className="text-lg font-semibold text-gray-900">Reiseplan</h3>
            </div>
            <div className="text-3xl font-bold text-teal-600">{itineraryItems.length}</div>
            <div className="text-sm text-gray-500 mt-1">Geplante Aktivitäten</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🎒</span>
              <h3 className="text-lg font-semibold text-gray-900">Packliste</h3>
            </div>
            <div className="text-3xl font-bold text-teal-600">
              {packingLists.filter(p => p.packed).length}/{packingLists.length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Eingepackt</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-bold mb-4">👥 Reisende</h3>
          <div className="flex flex-wrap gap-3">
            {tripMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                <span className="text-2xl">👤</span>
                <div>
                  <div className="font-semibold">{member.user?.name || 'Unbekannt'}</div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderTripsManagement = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">🌍 Meine Reisen</h2>
          <button 
            onClick={() => setShowNewTripModal(true)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            ✈️ Neue Reise
          </button>
        </div>

        {allUserTrips.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-bold mb-2">Keine Reisen gefunden</h3>
            <p className="text-gray-600 mb-6">Erstelle deine erste Reise, um loszulegen!</p>
            <button 
              onClick={() => setShowNewTripModal(true)}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              ✈️ Neue Reise erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allUserTrips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => {
                  setCurrentTrip(trip)
                  loadTripData(trip.id)
                  setActiveTab('overview')
                }}
                className={`bg-white p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  currentTrip?.id === trip.id ? 'border-teal-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{trip.flag}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{trip.name}</h3>
                    <p className="text-sm text-gray-600">{trip.destination}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Start:</span>
                    <span className="font-semibold">{new Date(trip.start_date).toLocaleDateString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ende:</span>
                    <span className="font-semibold">{new Date(trip.end_date).toLocaleDateString('de-DE')}</span>
                  </div>
                  {trip.budget > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-semibold">{trip.budget} {trip.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mitglieder:</span>
                    <span className="font-semibold">{trip.member_count || tripMembers.length} 👥</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    trip.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {trip.status === 'active' ? '✅ Aktiv' : '📁 Archiviert'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderExpenses = () => {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as { [key: string]: number })

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">💰 Ausgaben</h2>
          <button 
            onClick={() => setShowAddExpenseModal(true)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            + Neue Ausgabe
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(categoryTotals).map(([category, total]) => (
            <div key={category} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-2xl mb-2">{getExpenseIcon(category)}</div>
              <div className="text-sm text-gray-600">{category}</div>
              <div className="text-xl font-bold text-teal-600">{total.toFixed(2)} {currentTrip?.currency || 'EUR'}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bezahlt von</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(expense.date).toLocaleDateString('de-DE')}</td>
                  <td className="px-6 py-4 text-sm font-medium">{expense.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="flex items-center gap-2">
                      {getExpenseIcon(expense.category)} {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{expense.paid_by}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-teal-600">
                    {expense.amount.toFixed(2)} {currentTrip?.currency || 'EUR'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderItinerary = () => {
    const days = [...new Set(itineraryItems.map(item => item.day))].sort((a, b) => a - b)

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">🗓️ Reiseplan</h2>
          <button 
            onClick={() => setShowAddActivityModal(true)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            + Neue Aktivität
          </button>
        </div>

        {days.map(day => (
          <div key={day} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold mb-4">Tag {day}</h3>
            <div className="space-y-3">
              {itineraryItems
                .filter(item => item.day === day)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(item => (
                  <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl">{getActivityTypeIcon(item.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm text-gray-600">{item.time}</span>
                        <h4 className="font-semibold">{item.title}</h4>
                      </div>
                      {item.details && <p className="text-sm text-gray-600">{item.details}</p>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPacking = () => {
    const categories = [...new Set(packingLists.map(item => item.category))]

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">🎒 Packliste</h2>
          <div className="text-teal-600 font-semibold">
            {packingLists.filter(p => p.packed).length} / {packingLists.length} eingepackt
          </div>
        </div>

        {categories.map(category => (
          <div key={category} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">{category}</h3>
            <div className="space-y-2">
              {packingLists
                .filter(item => item.category === category)
                .map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox" 
                      checked={item.packed}
                      onChange={() => {
                        setPackingLists(packingLists.map(p => 
                          p.id === item.id ? { ...p, packed: !p.packed } : p
                        ))
                      }}
                      className="w-5 h-5 text-teal-600"
                    />
                    <span className={item.packed ? 'line-through text-gray-400' : ''}>{item.item}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderMapView = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">🗺️ Karte</h2>
          <button 
            onClick={() => setShowAddLocationModal(true)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            📍 Neuer Ort
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold mb-2">Karte wird geladen...</h3>
          <p className="text-gray-600 mb-6">
            Installiere die Leaflet-Pakete, um die interaktive Karte zu nutzen:
          </p>
          <code className="bg-gray-100 px-4 py-2 rounded text-sm">
            npm install leaflet react-leaflet @types/leaflet
          </code>
          <div className="mt-6 text-left">
            <h4 className="font-semibold mb-2">Gespeicherte Orte ({locations.length}):</h4>
            <div className="space-y-2">
              {locations.map(loc => (
                <div key={loc.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-semibold">{loc.name}</div>
                  <div className="text-sm text-gray-600">{loc.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {loc.latitude}, {loc.longitude} • {loc.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderFriendsAndInvitations = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">👥 Team & Einladungen</h2>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            ✉️ Freund einladen
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">Aktuelle Mitglieder</h3>
          <div className="space-y-3">
            {tripMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👤</span>
                  <div>
                    <div className="font-semibold">{member.user?.name || 'Unbekannt'}</div>
                    <div className="text-sm text-gray-600">{member.user?.email || 'Keine E-Mail'}</div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                  member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {member.role === 'owner' ? '👑 Owner' :
                   member.role === 'admin' ? '⭐ Admin' : '👤 Member'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {invitations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Offene Einladungen</h3>
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-semibold">{inv.invited_email}</div>
                    <div className="text-sm text-gray-600">
                      Läuft ab: {new Date(inv.expires_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    ⏳ Ausstehend
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSettlement = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">💳 Abrechnung</h2>

        {settlements.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2">Alles ausgeglichen!</h3>
            <p className="text-gray-600">Es gibt keine offenen Beträge.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Offene Zahlungen</h3>
            <div className="space-y-3">
              {settlements.map((settlement, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💸</span>
                    <div>
                      <div className="font-semibold">
                        {settlement.from} → {settlement.to}
                      </div>
                      <div className="text-sm text-gray-600">Offener Betrag</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    {settlement.amount.toFixed(2)} {currentTrip?.currency || 'EUR'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAdmin = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">⚙️ Admin</h2>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">Reise-Einstellungen</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reisename</label>
              <input 
                type="text" 
                value={currentTrip?.name || ''}
                onChange={(e) => setCurrentTrip({...currentTrip, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget ({currentTrip?.currency || 'EUR'})</label>
              <input 
                type="number" 
                value={currentTrip?.budget || 0}
                onChange={(e) => setCurrentTrip({...currentTrip, budget: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors">
              💾 Speichern
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4 text-red-600">Gefahrenzone</h3>
          <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
            🗑️ Reise löschen
          </button>
        </div>
      </div>
    )
  }

  // ========== MODALS ==========

  const renderNewTripModal = () => {
    if (!showNewTripModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">✈️ Neue Reise erstellen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reisename *</label>
              <input 
                type="text"
                placeholder="z.B. Barcelona Städtetrip"
                value={newTripData.name}
                onChange={(e) => setNewTripData({...newTripData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ziel *</label>
              <input 
                type="text"
                placeholder="z.B. Barcelona, Spanien"
                value={newTripData.destination}
                onChange={(e) => setNewTripData({...newTripData, destination: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emoji/Flagge</label>
              <input 
                type="text"
                placeholder="🌍"
                value={newTripData.flag}
                onChange={(e) => setNewTripData({...newTripData, flag: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                <input 
                  type="date"
                  value={newTripData.start_date}
                  onChange={(e) => setNewTripData({...newTripData, start_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ende</label>
                <input 
                  type="date"
                  value={newTripData.end_date}
                  onChange={(e) => setNewTripData({...newTripData, end_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget (optional)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={newTripData.budget}
                  onChange={(e) => setNewTripData({...newTripData, budget: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Währung</label>
                <select 
                  value={newTripData.currency}
                  onChange={(e) => setNewTripData({...newTripData, currency: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setShowNewTripModal(false)}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              onClick={createNewTrip}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Erstellen
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderAddExpenseModal = () => {
    if (!showAddExpenseModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">💰 Neue Ausgabe</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
              <select 
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Unterkunft">🏨 Unterkunft</option>
                <option value="Transport">✈️ Transport</option>
                <option value="Essen">🍽️ Essen</option>
                <option value="Aktivitäten">🎭 Aktivitäten</option>
                <option value="Shopping">🛍️ Shopping</option>
                <option value="Sonstiges">💰 Sonstiges</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung *</label>
              <input 
                type="text"
                placeholder="z.B. Hotel Barcelona"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Betrag * ({currentTrip?.currency || 'EUR'})</label>
              <input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bezahlt von</label>
              <select 
                value={newExpense.paid_by}
                onChange={(e) => setNewExpense({...newExpense, paid_by: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {tripMembers.map(member => (
                  <option key={member.id} value={member.user?.name}>
                    {member.user?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setShowAddExpenseModal(false)}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              onClick={createExpense}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderAddActivityModal = () => {
    if (!showAddActivityModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">🗓️ Neue Aktivität</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                <input 
                  type="number"
                  min="1"
                  value={newActivity.day}
                  onChange={(e) => setNewActivity({...newActivity, day: parseInt(e.target.value) || 1})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uhrzeit</label>
                <input 
                  type="time"
                  value={newActivity.time}
                  onChange={(e) => setNewActivity({...newActivity, time: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ</label>
              <select 
                value={newActivity.type}
                onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Aktivität">🎯 Aktivität</option>
                <option value="Sehenswürdigkeit">🏛️ Sehenswürdigkeit</option>
                <option value="Restaurant">🍽️ Restaurant</option>
                <option value="Transport">🚗 Transport</option>
                <option value="Check-in">🏨 Check-in</option>
                <option value="Check-out">🚪 Check-out</option>
                <option value="Freizeit">🎉 Freizeit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
              <input 
                type="text"
                placeholder="z.B. Sagrada Familia"
                value={newActivity.title}
                onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
              <textarea 
                placeholder="Zusätzliche Informationen..."
                value={newActivity.details}
                onChange={(e) => setNewActivity({...newActivity, details: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setShowAddActivityModal(false)}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              onClick={createActivity}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Hinzufügen
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
          <h2 className="text-2xl font-bold mb-6">✉️ Freund einladen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail-Adresse *</label>
              <input 
                type="email"
                placeholder="freund@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                📧 Es wird ein Einladungslink erstellt, den du per E-Mail versenden kannst.
                Der Link ist 7 Tage gültig.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                setShowInviteModal(false)
                setInviteEmail('')
              }}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              onClick={sendInvitation}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Einladen
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderAddLocationModal = () => {
    if (!showAddLocationModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">📍 Neuer Ort</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input 
                type="text"
                placeholder="z.B. Hotel Barcelona"
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse *</label>
              <input 
                type="text"
                placeholder="Carrer de Balmes 132, Barcelona"
                value={newLocation.address}
                onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ</label>
              <select 
                value={newLocation.type}
                onChange={(e) => setNewLocation({...newLocation, type: e.target.value as any})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="hotel">🏨 Hotel</option>
                <option value="restaurant">🍽️ Restaurant</option>
                <option value="activity">🎯 Aktivität</option>
                <option value="transport">🚗 Transport</option>
                <option value="other">📍 Sonstiges</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
              <textarea 
                placeholder="Zusätzliche Informationen..."
                value={newLocation.notes}
                onChange={(e) => setNewLocation({...newLocation, notes: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setShowAddLocationModal(false)}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button 
              onClick={addLocation}
              className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== MAIN RENDER ==========

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
                <p className="text-sm text-gray-600">v2.0 - Multi-Trip Edition</p>
              </div>
            </div>
            {currentTrip && (
              <div className="hidden md:flex items-center gap-3 bg-teal-50 px-4 py-2 rounded-lg">
                <span className="text-2xl">{currentTrip.flag}</span>
                <div>
                  <div className="font-semibold text-gray-900">{currentTrip.name}</div>
                  <div className="text-sm text-gray-600">{currentTrip.destination}</div>
                </div>
              </div>
            )}
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
      {renderNewTripModal()}
      {renderAddExpenseModal()}
      {renderAddActivityModal()}
      {renderInviteModal()}
      {renderAddLocationModal()}
    </div>
  )
}
