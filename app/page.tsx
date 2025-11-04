'use client'

import { useState, useEffect } from 'react'
import { supabase, Trip, Expense, ItineraryItem, PackingItem } from '@/lib/supabase'

export default function TravelTrackerPro() {
  // State Management
  const [activeTab, setActiveTab] = useState('overview')
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([])
  const [packingItems, setPackingItems] = useState<PackingItem[]>([])
  const [selectedDay, setSelectedDay] = useState(1)
  const [loading, setLoading] = useState(true)

  // V2 Features - Neue States
  const [allUserTrips, setAllUserTrips] = useState<any[]>([])
  const [tripMembers, setTripMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member')
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [newTripData, setNewTripData] = useState({
    name: '', destination: '', flag: '🌍', start_date: '', end_date: '', budget: 0, currency: 'EUR'
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [newLocation, setNewLocation] = useState({
    name: '', address: '', type: 'activity' as const, notes: ''
  })

  
  // Packing Templates
  const packingTemplates = {
    summer: {
      name: 'Sommer',
      icon: '☀️',
      categories: {
        '👕 Kleidung': [
          { item: 'T-Shirts (5-7)', essential: true },
          { item: 'Shorts (2-3)', essential: true },
          { item: 'Badehose/Badeanzug', essential: true },
          { item: 'Leichte Hose', essential: false },
          { item: 'Leichte Jacke', essential: true },
          { item: 'Unterwäsche (7+)', essential: true },
          { item: 'Socken (7+)', essential: true },
          { item: 'Schlafanzug', essential: false },
          { item: 'Bequeme Schuhe', essential: true },
          { item: 'Sandalen/Flip-Flops', essential: true }
        ],
        '🧴 Hygiene': [
          { item: 'Zahnbürste & Zahnpasta', essential: true },
          { item: 'Sonnencreme LSF 30+', essential: true },
          { item: 'Shampoo & Duschgel', essential: true },
          { item: 'Deo', essential: true },
          { item: 'After-Sun Lotion', essential: false },
          { item: 'Mückenschutz', essential: false },
          { item: 'Erste-Hilfe-Set', essential: true },
          { item: 'Medikamente', essential: true }
        ],
        '🔌 Elektronik': [
          { item: 'Smartphone', essential: true },
          { item: 'Ladekabel', essential: true },
          { item: 'Powerbank', essential: false },
          { item: 'Kopfhörer', essential: false },
          { item: 'Kamera', essential: false },
          { item: 'Reiseadapter', essential: true }
        ],
        '📄 Dokumente': [
          { item: 'Reisepass/Ausweis', essential: true },
          { item: 'Flugtickets', essential: true },
          { item: 'Hotelbuchung', essential: true },
          { item: 'Reiseversicherung', essential: true },
          { item: 'Kreditkarten', essential: true },
          { item: 'Bargeld', essential: true }
        ],
        '🏖️ Strand': [
          { item: 'Strandtuch', essential: true },
          { item: 'Sonnenbrille', essential: true },
          { item: 'Sonnenhut/Cap', essential: true },
          { item: 'Wasserflasche', essential: false },
          { item: 'Buch/E-Reader', essential: false },
          { item: 'Schnorchelset', essential: false },
          { item: 'Strandtasche', essential: false }
        ]
      }
    },
    spring: {
      name: 'Frühling',
      icon: '🌸',
      categories: {
        '👕 Kleidung': [
          { item: 'Langarmshirts (3-4)', essential: true },
          { item: 'T-Shirts (3-4)', essential: true },
          { item: 'Jeans/Hosen (2)', essential: true },
          { item: 'Leichte Jacke', essential: true },
          { item: 'Regenjacke', essential: true },
          { item: 'Pullover', essential: false },
          { item: 'Unterwäsche (7+)', essential: true },
          { item: 'Socken (7+)', essential: true },
          { item: 'Schuhe (2 Paar)', essential: true }
        ],
        '🧴 Hygiene': [
          { item: 'Zahnbürste & Zahnpasta', essential: true },
          { item: 'Shampoo & Duschgel', essential: true },
          { item: 'Deo', essential: true },
          { item: 'Sonnencreme', essential: false },
          { item: 'Lippenbalsam', essential: false },
          { item: 'Erste-Hilfe-Set', essential: true }
        ]
      }
    },
    autumn: {
      name: 'Herbst',
      icon: '🍂',
      categories: {
        '👕 Kleidung': [
          { item: 'Langarmshirts (4-5)', essential: true },
          { item: 'Pullover (2-3)', essential: true },
          { item: 'Jeans/Hosen (2-3)', essential: true },
          { item: 'Warme Jacke', essential: true },
          { item: 'Regenjacke', essential: true },
          { item: 'Schal', essential: false },
          { item: 'Unterwäsche (7+)', essential: true },
          { item: 'Socken (7+)', essential: true },
          { item: 'Feste Schuhe', essential: true }
        ],
        '🧴 Hygiene': [
          { item: 'Zahnbürste & Zahnpasta', essential: true },
          { item: 'Shampoo & Duschgel', essential: true },
          { item: 'Deo', essential: true },
          { item: 'Handcreme', essential: false },
          { item: 'Lippenbalsam', essential: false },
          { item: 'Erste-Hilfe-Set', essential: true }
        ]
      }
    },
    winter: {
      name: 'Winter',
      icon: '❄️',
      categories: {
        '👕 Kleidung': [
          { item: 'Winterjacke', essential: true },
          { item: 'Pullover (3-4)', essential: true },
          { item: 'Thermounterwäsche', essential: true },
          { item: 'Jeans/Hosen (2-3)', essential: true },
          { item: 'Mütze', essential: true },
          { item: 'Schal', essential: true },
          { item: 'Handschuhe', essential: true },
          { item: 'Warme Socken (7+)', essential: true },
          { item: 'Winterstiefel', essential: true }
        ],
        '🧴 Hygiene': [
          { item: 'Zahnbürste & Zahnpasta', essential: true },
          { item: 'Shampoo & Duschgel', essential: true },
          { item: 'Deo', essential: true },
          { item: 'Handcreme', essential: true },
          { item: 'Lippenbalsam', essential: true },
          { item: 'Erste-Hilfe-Set', essential: true }
        ]
      }
    }
  }

  // Determine season from date
  const getSeason = (dateString: string): keyof typeof packingTemplates => {
    const month = new Date(dateString).getMonth() + 1
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'autumn'
    return 'winter'
  }

  // Load Data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load active trip
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (trips && trips.length > 0) {
        setCurrentTrip(trips[0])
        
        // Load expenses
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('*')
          .eq('trip_id', trips[0].id)
          .order('created_at', { ascending: false })
        
        if (expensesData) setExpenses(expensesData)

        // Load itinerary
        const { data: itineraryData } = await supabase
          .from('itinerary')
          .select('*')
          .eq('trip_id', trips[0].id)
          .order('day', { ascending: true })
          .order('time', { ascending: true })
        
        if (itineraryData) setItineraryItems(itineraryData)

        // Load or initialize packing list
        const { data: packingData } = await supabase
          .from('packing_items')
          .select('*')
          .eq('trip_id', trips[0].id)
        
        if (packingData && packingData.length > 0) {
          setPackingItems(packingData)
        } else {
          // Initialize packing list based on season
          await initializePackingList(trips[0])
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializePackingList = async (trip: Trip) => {
    const season = getSeason(trip.start_date)
    const template = packingTemplates[season]
    const items: Omit<PackingItem, 'id' | 'created_at'>[] = []

    Object.entries(template.categories).forEach(([category, categoryItems]) => {
      categoryItems.forEach(({ item, essential }) => {
        items.push({
          trip_id: trip.id,
          category,
          item,
          packed: false,
          essential
        })
      })
    })

    const { data } = await supabase
      .from('packing_items')
      .insert(items)
      .select()

    if (data) setPackingItems(data)
  }

  // Toggle packing item
  const togglePackingItem = async (itemId: string) => {
    const item = packingItems.find(i => i.id === itemId)
    if (!item) return

    const { data } = await supabase
      .from('packing_items')
      .update({ packed: !item.packed })
      .eq('id', itemId)
      .select()

    if (data) {
      setPackingItems(packingItems.map(i => 
        i.id === itemId ? data[0] : i
      ))
    }
  }

  // Calculate packing progress
  const calculatePackingProgress = () => {
    if (packingItems.length === 0) return 0
    const packed = packingItems.filter(i => i.packed).length
    return Math.round((packed / packingItems.length) * 100)
  }

  // Calculate total expenses
  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  // Calculate expenses per person
  const calculateExpensesPerPerson = () => {
    const total = calculateTotalExpenses()
    // In real app, get number of travelers from users table
    const travelers = 3
    return total / travelers
  }

  // Calculate days until trip
  const calculateDaysUntilTrip = () => {
    if (!currentTrip) return 0
    const today = new Date()
    const startDate = new Date(currentTrip.start_date)
    const diffTime = startDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Calculate trip duration
  const calculateTripDuration = () => {
    if (!currentTrip) return 0
    const start = new Date(currentTrip.start_date)
    const end = new Date(currentTrip.end_date)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // Get expense icon
  const getExpenseIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Transport': '✈️',
      'Unterkunft': '🏨',
      'Essen': '🍽️',
      'Aktivität': '🎫',
      'Shopping': '🛍️',
      'Sonstiges': '💰'
    }
    return icons[category] || '💰'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl">Lädt... 🌍</div>
      </div>
    )
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-2xl font-bold mb-4">Willkommen bei TravelTracker Pro!</h1>
          <p className="text-gray-600 mb-6">
            Du hast noch keine aktive Reise. Erstelle deine erste Reise, um loszulegen!
          </p>
          <button 
            className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
            onClick={() => alert('In der Vollversion kannst du hier eine neue Reise erstellen!')}
          >
            ➕ Neue Reise erstellen
          </button>
        </div>
      </div>
    )
  }

  // Render functions will be in part 2...
  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      {/* Phone Container */}
      <div className="bg-white rounded-[25px] shadow-2xl max-w-[400px] w-full overflow-hidden flex flex-col" style={{ height: '90vh', maxHeight: '800px' }}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-5 text-center flex-shrink-0">
          <h1 className="text-2xl font-bold mb-1">🌍 TravelTracker Pro</h1>
          <p className="text-sm opacity-90">Deine Reise-Management-App</p>
          
          <div className="bg-white/20 rounded-2xl p-3 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentTrip.flag}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold">{currentTrip.name}</div>
                <div className="text-xs opacity-90">
                  {new Date(currentTrip.start_date).toLocaleDateString('de-DE')} - {new Date(currentTrip.end_date).toLocaleDateString('de-DE')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-gray-50 border-b-2 border-gray-200 flex-shrink-0 overflow-x-auto">
          {[
            { id: 'overview', icon: '📊', label: 'Übersicht' },
            { id: 'trips', icon: '🌍', label: 'Reisen' },      // NEU
            { id: 'expenses', icon: '💰', label: 'Ausgaben' },
            { id: 'itinerary', icon: '🗓️', label: 'Plan' },
            { id: 'packing', icon: '🎒', label: 'Packliste' },
            { id: 'map', icon: '🗺️', label: 'Karte' },         // NEU
            { id: 'friends', icon: '👥', label: 'Team' },      // NEU
            { id: 'settlement', icon: '💳', label: 'Abrechnung' },
            { id: 'admin', icon: '👑', label: 'Admin' }
          ].map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] p-3 text-center text-xs font-semibold cursor-pointer transition-all ${
                activeTab === tab.id 
                  ? 'text-[#667eea] bg-white border-b-3 border-[#667eea]' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="text-xl mb-1">{tab.icon}</div>
              {tab.label}
            </div>
          ))}
        </div>

        {/* Content Area - will continue in next part */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Content will be rendered here based on activeTab */}
          {renderTabContent()}
        </div>
      </div>
    </div>
  )

function renderTabContent() {
  switch (activeTab) {
    case 'overview': return renderOverview()
    case 'trips': return renderTripsManagement()         // NEU
    case 'expenses': return renderExpenses()
    case 'itinerary': return renderItinerary()
    case 'packing': return renderPacking()
    case 'map': return renderMapView()                   // NEU
    case 'friends': return renderFriendsAndInvitations() // NEU
    case 'settlement': return renderSettlement()
    case 'admin': return renderAdmin()
    default: return null
  }
}

function renderOverview() {
  const daysUntil = calculateDaysUntilTrip()
  const duration = calculateTripDuration()
  const total = calculateTotalExpenses()
  const perPerson = calculateExpensesPerPerson()
  const packingProgress = calculatePackingProgress()

  return (
    <div>
      {/* Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-blue-800">👋 Willkommen zurück!</div>
        <div className="text-sm text-blue-700">
          Deine {currentTrip?.name} beginnt in {daysUntil} Tagen. Zeit zum Packen!
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">€{total.toFixed(2)}</div>
          <div className="text-xs opacity-90">💰 Gesamtkosten</div>
        </div>
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">€{perPerson.toFixed(2)}</div>
          <div className="text-xs opacity-90">👤 Pro Person</div>
        </div>
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">{duration} Tage</div>
          <div className="text-xs opacity-90">📅 Reisedauer</div>
        </div>
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">{packingProgress}%</div>
          <div className="text-xs opacity-90">🎒 Gepackt</div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Letzte Aktivitäten</h3>
          <span className="text-xl">📝</span>
        </div>
        
        {expenses.slice(0, 3).map(expense => (
          <div key={expense.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <span className="text-2xl">{getExpenseIcon(expense.category)}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">{expense.description}</div>
              <div className="text-xs text-gray-500">Bezahlt von {expense.paid_by}</div>
            </div>
            <div className="font-bold text-[#667eea]">€{expense.amount.toFixed(2)}</div>
          </div>
        ))}
        
        {packingProgress > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">🎒</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">Packliste aktualisiert</div>
              <div className="text-xs text-gray-500">{packingItems.filter(i => i.packed).length} von {packingItems.length} Items</div>
            </div>
            <div className="font-bold text-[#667eea]">{packingProgress}%</div>
          </div>
        )}
      </div>

      {/* Next Activities */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Nächste Aktivitäten</h3>
          <span className="text-xl">🎯</span>
        </div>
        
        {itineraryItems.slice(0, 3).map(item => (
          <div key={item.id} className="p-4 bg-gray-50 rounded-xl mb-3">
            <div className="font-semibold mb-1">{item.title}</div>
            <div className="text-sm text-gray-600">Tag {item.day} • {item.time} Uhr</div>
          </div>
        ))}

        {itineraryItems.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-sm">Noch keine Aktivitäten geplant</div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderExpenses() {
  // Calculate category totals
  const categoryTotals: { [key: string]: number } = {}
  let total = 0
  
  expenses.forEach(expense => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    total += expense.amount
  })

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-yellow-800">💡 Tipp</div>
        <div className="text-sm text-yellow-700">Füge alle Ausgaben hinzu für eine faire Abrechnung!</div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Alle Ausgaben</h3>
          <button 
            className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-full text-sm font-semibold"
            onClick={() => alert('In der Vollversion kannst du hier neue Ausgaben hinzufügen!')}
          >
            + Neu
          </button>
        </div>

        {expenses.map(expense => (
          <div key={expense.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <span className="text-2xl">{getExpenseIcon(expense.category)}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">{expense.description}</div>
              <div className="text-xs text-gray-500">Bezahlt von {expense.paid_by} • {expense.category}</div>
            </div>
            <div className="font-bold text-[#667eea]">€{expense.amount.toFixed(2)}</div>
          </div>
        ))}

        {expenses.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-sm">Noch keine Ausgaben vorhanden</div>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Kosten pro Kategorie</h3>
            <span className="text-xl">📊</span>
          </div>

          {categories.map(([category, amount]) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0
            return (
              <div key={category} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{getExpenseIcon(category)} {category}</span>
                  <span className="font-semibold">€{amount.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#667eea] h-full rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function renderItinerary() {
  const dayItems = itineraryItems.filter(item => item.day === selectedDay)
  const maxDay = Math.max(...itineraryItems.map(i => i.day), 5)

  return (
    <div>
      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
        {Array.from({ length: maxDay }, (_, i) => i + 1).map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-shrink-0 px-5 py-2 rounded-xl font-semibold transition-all ${
              selectedDay === day
                ? 'bg-[#667eea] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tag {day}
          </button>
        ))}
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-4">
        📅 {currentTrip && new Date(new Date(currentTrip.start_date).getTime() + (selectedDay - 1) * 86400000).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>

      {dayItems.map(item => (
        <div key={item.id} className="flex gap-4 mb-5">
          <div className="bg-[#667eea] text-white px-3 py-2 rounded-xl font-semibold text-sm h-fit min-w-[60px] text-center">
            {item.time}
          </div>
          <div className="flex-1 bg-gray-50 p-4 rounded-xl">
            <div className="font-bold text-gray-800 mb-1">{item.title}</div>
            <div className="text-sm text-gray-600 mb-2">{item.details}</div>
            <span className="inline-block bg-[#667eea] text-white text-xs px-3 py-1 rounded-full">
              {item.type}
            </span>
          </div>
        </div>
      ))}

      {dayItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🗓️</div>
          <div className="text-lg font-semibold mb-2">Noch nichts geplant</div>
          <div className="text-sm">Füge Aktivitäten für Tag {selectedDay} hinzu</div>
        </div>
      )}
    </div>
  )
}

function renderPacking() {
  const progress = calculatePackingProgress()
  const grouped: { [key: string]: PackingItem[] } = {}
  
  packingItems.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  const season = currentTrip ? getSeason(currentTrip.start_date) : 'summer'
  const seasonInfo = packingTemplates[season]

  return (
    <div>
      {/* Progress */}
      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-2xl p-5 text-center mb-5">
        <div className="text-base mb-2">Dein Pack-Fortschritt</div>
        <div className="text-4xl font-bold mb-4">{progress}%</div>
        <div className="bg-white/30 h-3 rounded-full overflow-hidden">
          <div 
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-blue-800">{seasonInfo.icon} {seasonInfo.name}-Packliste</div>
        <div className="text-sm text-blue-700">Basierend auf deinem Reisedatum ({currentTrip && new Date(currentTrip.start_date).toLocaleDateString('de-DE', { month: 'long' })})</div>
      </div>

      {progress === 100 && (
        <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-lg mb-5 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-xl font-bold text-green-800 mb-2">Perfekt gepackt!</div>
          <div className="text-sm text-green-700">Alle Items sind abgehakt. Du bist bereit! ✈️</div>
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => {
        const packedCount = items.filter(i => i.packed).length
        return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-gray-200 mb-3">
              <span className="text-2xl">{category.split(' ')[0]}</span>
              <h3 className="text-lg font-bold text-gray-800 flex-1">
                {category.split(' ').slice(1).join(' ')}
              </h3>
              <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                {packedCount}/{items.length}
              </span>
            </div>

            {items.map(item => (
              <div
                key={item.id}
                onClick={() => togglePackingItem(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all hover:translate-x-1 ${
                  item.packed ? 'bg-green-50 opacity-70' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  item.packed ? 'bg-[#667eea] border-[#667eea]' : 'border-[#667eea]'
                }`}>
                  {item.packed && <span className="text-white text-sm">✓</span>}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${item.packed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {item.item}
                  </div>
                  {item.essential && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-lg mt-1">
                      ⭐ Wichtig
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {packingItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🎒</div>
          <div className="text-lg font-semibold mb-2">Packliste wird erstellt...</div>
          <div className="text-sm">Lade die Seite neu</div>
        </div>
      )}

      <button
        onClick={() => {
          if (confirm('Möchtest du wirklich alle Items zurücksetzen?')) {
            packingItems.forEach(item => {
              if (item.packed) {
                supabase.from('packing_items').update({ packed: false }).eq('id', item.id).then(() => {
                  setPackingItems(packingItems.map(i => ({ ...i, packed: false })))
                })
              }
            })
          }
        }}
        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all mt-3"
      >
        🔄 Alles zurücksetzen
      </button>
    </div>
  )
}

function renderSettlement() {
  // Simplified settlement calculation for demo
  // In real app, calculate based on actual expense data
  return (
    <div>
      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-green-800">✅ Abrechnung berechnet!</div>
        <div className="text-sm text-green-700">Basierend auf allen Ausgaben</div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Wer schuldet wem?</h3>
          <span className="text-xl">💸</span>
        </div>

        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">💳</div>
          <div className="text-sm">Abrechnung wird berechnet...</div>
          <div className="text-xs mt-2">Basierend auf {expenses.length} Ausgaben</div>
        </div>
      </div>

      <button
        onClick={() => alert('In der Vollversion kannst du die Abrechnung als PDF exportieren!')}
        className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
      >
        📄 Als PDF exportieren
      </button>
    </div>
  )
}

function renderAdmin() {
  return (
    <div>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-yellow-800">👑 Admin-Bereich</div>
        <div className="text-sm text-yellow-700">Verwalte Benutzer und Einstellungen</div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Reise-Einstellungen</h3>
          <span className="text-xl">⚙️</span>
        </div>

        <div className="mb-4">
          <label className="block font-semibold text-gray-700 mb-2 text-sm">🏨 Reisename</label>
          <input
            type="text"
            value={currentTrip?.name}
            readOnly
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold text-gray-700 mb-2 text-sm">📍 Reiseziel</label>
          <input
            type="text"
            value={currentTrip?.destination}
            readOnly
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-2 text-sm">📅 Start</label>
            <input
              type="date"
              value={currentTrip?.start_date}
              readOnly
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2 text-sm">📅 Ende</label>
            <input
              type="date"
              value={currentTrip?.end_date}
              readOnly
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => alert('Einstellungen gespeichert! ✅')}
          className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold"
        >
          💾 Einstellungen speichern
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Statistiken</h3>
          <span className="text-xl">📊</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">💰 Ausgaben:</span>
            <span className="font-bold">{expenses.length} Einträge</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">📅 Aktivitäten:</span>
            <span className="font-bold">{itineraryItems.length} geplant</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">🎒 Pack-Items:</span>
            <span className="font-bold">{packingItems.length} Stück</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-2xl p-6 text-center">
        <div className="text-5xl mb-3">👑</div>
        <div className="text-lg font-bold mb-1">Du bist Admin</div>
        <div className="text-sm opacity-90">Volle Kontrolle über diese Reise</div>
      </div>
    </div>
  )
}
  // =====================================================
// FREUNDE & EINLADUNGEN KOMPONENTE
// =====================================================

function renderFriendsAndInvitations() {
  const [tripMembers, setTripMembers] = useState<TripMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member')

  useEffect(() => {
    loadTripMembers()
    loadInvitations()
  }, [currentTrip])

  const loadTripMembers = async () => {
    if (!currentTrip) return

    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('trip_id', currentTrip.id)

      if (error) throw error
      
      setTripMembers(data || [])

      // Find current user's role
      const currentMember = data?.find(m => m.user_id === currentUser.id)
      if (currentMember) {
        setUserRole(currentMember.role)
      }
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const loadInvitations = async () => {
    if (!currentTrip) return

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:users!invited_by(*)
        `)
        .eq('trip_id', currentTrip.id)
        .eq('status', 'pending')

      if (error) throw error
      setInvitations(data || [])
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const sendInvitation = async () => {
    if (!currentTrip) return

    try {
      // Generate token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      // Check if already member
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('trip_members')
          .select('id')
          .eq('trip_id', currentTrip.id)
          .eq('user_id', existingUser.id)
          .single()

        if (existingMember) {
          alert('❌ Diese Person ist bereits Mitglied der Reise')
          return
        }
      }

      // Create invitation
      const { error } = await supabase
        .from('invitations')
        .insert({
          trip_id: currentTrip.id,
          invited_by: currentUser.id,
          invited_email: inviteEmail,
          invited_user_id: existingUser?.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })

      if (error) throw error

      // Generate invite link
      const inviteLink = `${window.location.origin}/invite/${token}`

      // Copy to clipboard
      navigator.clipboard.writeText(inviteLink)

      alert(`✅ Einladung erstellt!\n\n📋 Link wurde in die Zwischenablage kopiert:\n${inviteLink}\n\nSchicke diesen Link an ${inviteEmail}`)

      setShowInviteModal(false)
      setInviteEmail('')
      loadInvitations()
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('❌ Fehler beim Erstellen der Einladung')
    }
  }

  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Möchtest du ${memberName} wirklich aus der Reise entfernen?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      alert(`✅ ${memberName} wurde entfernt`)
      loadTripMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('❌ Fehler beim Entfernen des Mitglieds')
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      alert('✅ Einladung zurückgezogen')
      loadInvitations()
    } catch (error) {
      console.error('Error canceling invitation:', error)
      alert('❌ Fehler beim Zurückziehen der Einladung')
    }
  }

  const canManageMembers = userRole === 'owner' || userRole === 'admin'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">👥 Teilnehmer</h2>
        {canManageMembers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-full text-sm font-semibold"
          >
            ➕ Einladen
          </button>
        )}
      </div>

      {/* Current Trip Info */}
      <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{currentTrip?.flag}</span>
          <div>
            <div className="font-bold">{currentTrip?.name}</div>
            <div className="text-sm opacity-90">{currentTrip?.destination}</div>
          </div>
        </div>
        <div className="text-sm opacity-90">
          {tripMembers.length} {tripMembers.length === 1 ? 'Person' : 'Personen'} •{' '}
          {invitations.length > 0 && `${invitations.length} ausstehende Einladung${invitations.length > 1 ? 'en' : ''}`}
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <h3 className="font-bold text-gray-800 mb-3">Mitglieder</h3>

        {tripMembers.map(member => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold">
              {member.user?.name?.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1">
              <div className="font-semibold text-sm text-gray-800">
                {member.user?.name}
                {member.user_id === currentUser.id && (
                  <span className="text-xs text-gray-500 ml-2">(Du)</span>
                )}
              </div>
              <div className="text-xs text-gray-500">{member.user?.email}</div>
            </div>

            <div className="flex items-center gap-2">
              {member.role === 'owner' && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold">
                  👑 Owner
                </span>
              )}
              {member.role === 'admin' && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
                  ⭐ Admin
                </span>
              )}
              {member.role === 'member' && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  Mitglied
                </span>
              )}

              {canManageMembers && member.role !== 'owner' && member.user_id !== currentUser.id && (
                <button
                  onClick={() => removeMember(member.id, member.user?.name || 'Benutzer')}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">⏳ Ausstehende Einladungen</h3>

          {invitations.map(invitation => (
            <div key={invitation.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl mb-2">
              <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                📧
              </div>
              
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">
                  {invitation.invited_email}
                </div>
                <div className="text-xs text-gray-500">
                  Eingeladen von {invitation.inviter?.name}
                </div>
              </div>

              {canManageMembers && (
                <button
                  onClick={() => cancelInvitation(invitation.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Zurückziehen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Your Role Info */}
      <div className="mt-5 p-4 bg-blue-50 rounded-xl">
        <div className="text-sm text-blue-800">
          <strong>Deine Rolle:</strong>{' '}
          {userRole === 'owner' && '👑 Owner (volle Kontrolle)'}
          {userRole === 'admin' && '⭐ Admin (kann andere einladen)'}
          {userRole === 'member' && 'Mitglied (kann alle Features nutzen)'}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">✉️ Freund einladen</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="freund@example.com"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800">
                <strong>💡 Hinweis:</strong><br />
                Dein Freund erhält einen Einladungs-Link, mit dem er der Reise beitreten kann.
                Der Link ist 7 Tage gültig.
              </div>

              <button
                onClick={sendInvitation}
                disabled={!inviteEmail || !inviteEmail.includes('@')}
                className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                📨 Einladung senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// =====================================================
// KARTEN-KOMPONENTE
// Zeigt alle Locations auf einer interaktiven Karte
// =====================================================

// INSTALLATION BENÖTIGT:
// npm install leaflet react-leaflet
// npm install --save-dev @types/leaflet

'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix für Leaflet Icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom Icons für verschiedene Location-Typen
const getMarkerIcon = (type: string) => {
  const icons: { [key: string]: string } = {
    accommodation: '🏨',
    restaurant: '🍽️',
    activity: '🎫',
    transport: '✈️',
    other: '📍'
  }

  return L.divIcon({
    html: `<div style="font-size: 24px;">${icons[type] || '📍'}</div>`,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  })
}

function renderMapView() {
  const [locations, setLocations] = useState<Location[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    type: 'activity' as const,
    notes: ''
  })
  const [mapCenter, setMapCenter] = useState<[number, number]>([41.3851, 2.1734]) // Barcelona default

  useEffect(() => {
    loadLocations()
    loadExpenses()
  }, [currentTrip])

  const loadLocations = async () => {
    if (!currentTrip) return

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('trip_id', currentTrip.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      setLocations(data || [])
      
      // Center map on first location
      if (data && data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude])
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const loadExpenses = async () => {
    if (!currentTrip) return

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', currentTrip.id)

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const addLocation = async () => {
    if (!currentTrip) return

    try {
      // Geocode address
      const coords = await geocodeAddress(newLocation.address)
      
      if (!coords) {
        alert('❌ Adresse konnte nicht gefunden werden')
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
      console.error('Error adding location:', error)
      alert('❌ Fehler beim Hinzufügen des Ortes')
    }
  }

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getExpensesByLocation = () => {
    // Group expenses by their descriptions/categories
    const grouped: { [key: string]: number } = {}
    
    expenses.forEach(expense => {
      const key = expense.description
      grouped[key] = (grouped[key] || 0) + expense.amount
    })

    return grouped
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">🗺️ Karte</h2>
        <button
          onClick={() => setShowAddLocationModal(true)}
          className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-full text-sm font-semibold"
        >
          ➕ Ort
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
          <div className="text-xs text-blue-600">📍 Orte</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl">
          <div className="text-2xl font-bold text-green-600">
            €{getTotalExpenses().toFixed(2)}
          </div>
          <div className="text-xs text-green-600">💰 Kosten</div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-5" style={{ height: '400px' }}>
        {typeof window !== 'undefined' && locations.length > 0 ? (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Markers */}
            {locations.map(location => (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={getMarkerIcon(location.type)}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-bold text-sm mb-1">{location.name}</div>
                    {location.address && (
                      <div className="text-xs text-gray-600 mb-2">{location.address}</div>
                    )}
                    {location.notes && (
                      <div className="text-xs text-gray-700">{location.notes}</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route Line */}
            {locations.length > 1 && (
              <Polyline
                positions={locations.map(l => [l.latitude, l.longitude])}
                color="#667eea"
                weight={3}
                opacity={0.6}
              />
            )}
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">🗺️</div>
              <div className="text-sm">Noch keine Orte hinzugefügt</div>
              <button
                onClick={() => setShowAddLocationModal(true)}
                className="mt-3 text-sm text-[#667eea] font-semibold"
              >
                Ersten Ort hinzufügen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Locations List */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <h3 className="font-bold text-gray-800 mb-3">📍 Alle Orte</h3>
        
        {locations.map(location => (
          <div key={location.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <span className="text-2xl">{getMarkerIcon(location.type).options.html}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm text-gray-800">{location.name}</div>
              {location.address && (
                <div className="text-xs text-gray-500">{location.address}</div>
              )}
              {location.notes && (
                <div className="text-xs text-gray-600 mt-1">{location.notes}</div>
              )}
            </div>
          </div>
        ))}

        {locations.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Noch keine Orte vorhanden
          </div>
        )}
      </div>

      {/* Expenses by Location */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">💰 Kosten</h3>
          
          {Object.entries(getExpensesByLocation()).map(([name, amount]) => (
            <div key={name} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl mb-2">
              <span className="text-sm text-gray-700">{name}</span>
              <span className="font-bold text-[#667eea]">€{amount.toFixed(2)}</span>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">Gesamt:</span>
              <span className="font-bold text-xl text-[#667eea]">
                €{getTotalExpenses().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">📍 Neuer Ort</h3>
              <button
                onClick={() => setShowAddLocationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                  placeholder="z.B. Sagrada Familia"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                  placeholder="z.B. Carrer de Mallorca, 401, Barcelona"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Typ
                </label>
                <select
                  value={newLocation.type}
                  onChange={(e) => setNewLocation({...newLocation, type: e.target.value as any})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                >
                  <option value="accommodation">🏨 Unterkunft</option>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="activity">🎫 Aktivität</option>
                  <option value="transport">✈️ Transport</option>
                  <option value="other">📍 Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notizen (optional)
                </label>
                <textarea
                  value={newLocation.notes}
                  onChange={(e) => setNewLocation({...newLocation, notes: e.target.value})}
                  placeholder="z.B. Tickets online buchen!"
                  rows={3}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                />
              </div>

              <button
                onClick={addLocation}
                disabled={!newLocation.name || !newLocation.address}
                className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                ✨ Ort hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Geocoding Helper (bereits in supabase-v2 enthalten)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    )
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}
// =====================================================
// REISEN-VERWALTUNG KOMPONENTE
// Füge diese Funktion zu deiner page.tsx hinzu
// =====================================================

function renderTripsManagement() {
  const [allTrips, setAllTrips] = useState<TripWithMembers[]>([])
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [newTripData, setNewTripData] = useState({
    name: '',
    destination: '',
    flag: '🌍',
    start_date: '',
    end_date: '',
    budget: 0,
    currency: 'EUR'
  })

  useEffect(() => {
    loadAllTrips()
  }, [])

  const loadAllTrips = async () => {
    try {
      // Load all trips for current user
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          *,
          trip:trips(*),
          members:trip_members(
            *,
            user:users(*)
          )
        `)
        .eq('user_id', currentUser.id)
      
      if (error) throw error
      
      const tripsWithMembers = data.map(item => ({
        ...item.trip,
        members: item.members,
        member_count: item.members.length,
        user_role: item.role
      }))
      
      setAllTrips(tripsWithMembers)
    } catch (error) {
      console.error('Error loading trips:', error)
    }
  }

  const createNewTrip = async () => {
    try {
      // Create trip
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

      // Add current user as owner
      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripData.id,
          user_id: currentUser.id,
          role: 'owner'
        })

      if (memberError) throw memberError

      // Reset form and reload
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
      loadAllTrips()
      
      alert('✅ Neue Reise erstellt!')
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('❌ Fehler beim Erstellen der Reise')
    }
  }

  const switchToTrip = (trip: Trip) => {
    setCurrentTrip(trip)
    setActiveTab('overview')
    alert(`Gewechselt zu: ${trip.name}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Meine Reisen</h2>
        <button
          onClick={() => setShowNewTripModal(true)}
          className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-full text-sm font-semibold hover:shadow-lg transition-all"
        >
          ➕ Neue Reise
        </button>
      </div>

      {/* Active Trips */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-700 mb-3">🌍 Aktive Reisen</h3>
        {allTrips.filter(t => t.status === 'active').map(trip => (
          <div
            key={trip.id}
            onClick={() => switchToTrip(trip)}
            className="bg-white rounded-2xl p-4 mb-3 shadow-sm cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{trip.flag}</span>
              <div className="flex-1">
                <div className="font-bold text-gray-800">{trip.name}</div>
                <div className="text-sm text-gray-500">{trip.destination}</div>
              </div>
              {trip.id === currentTrip?.id && (
                <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">
                  Aktiv
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>📅 {new Date(trip.start_date).toLocaleDateString('de-DE')}</span>
              <span>→</span>
              <span>{new Date(trip.end_date).toLocaleDateString('de-DE')}</span>
              <span className="ml-auto">👥 {trip.member_count} Personen</span>
            </div>

            {/* Members */}
            {trip.members && trip.members.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {trip.members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full text-xs"
                    >
                      <span>👤</span>
                      <span>{member.user?.name}</span>
                      {member.role === 'owner' && (
                        <span className="text-yellow-600">👑</span>
                      )}
                      {member.role === 'admin' && (
                        <span className="text-blue-600">⭐</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {allTrips.filter(t => t.status === 'active').length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">✈️</div>
            <div className="text-sm">Noch keine aktiven Reisen</div>
          </div>
        )}
      </div>

      {/* Archived Trips */}
      {allTrips.filter(t => t.status === 'archived').length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-700 mb-3">📦 Archiviert</h3>
          {allTrips.filter(t => t.status === 'archived').map(trip => (
            <div
              key={trip.id}
              className="bg-gray-50 rounded-2xl p-4 mb-3 opacity-70"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{trip.flag}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-700">{trip.name}</div>
                  <div className="text-xs text-gray-500">{trip.destination}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Trip Modal */}
      {showNewTripModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">✈️ Neue Reise</h3>
              <button
                onClick={() => setShowNewTripModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏨 Reisename
                </label>
                <input
                  type="text"
                  value={newTripData.name}
                  onChange={(e) => setNewTripData({...newTripData, name: e.target.value})}
                  placeholder="z.B. Sommer in Italien"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📍 Reiseziel
                </label>
                <input
                  type="text"
                  value={newTripData.destination}
                  onChange={(e) => setNewTripData({...newTripData, destination: e.target.value})}
                  placeholder="z.B. Rom, Italien"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏳️ Flagge
                </label>
                <select
                  value={newTripData.flag}
                  onChange={(e) => setNewTripData({...newTripData, flag: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                >
                  <option value="🇪🇸">🇪🇸 Spanien</option>
                  <option value="🇫🇷">🇫🇷 Frankreich</option>
                  <option value="🇮🇹">🇮🇹 Italien</option>
                  <option value="🇬🇷">🇬🇷 Griechenland</option>
                  <option value="🇵🇹">🇵🇹 Portugal</option>
                  <option value="🇩🇪">🇩🇪 Deutschland</option>
                  <option value="🇦🇹">🇦🇹 Österreich</option>
                  <option value="🇨🇭">🇨🇭 Schweiz</option>
                  <option value="🇳🇱">🇳🇱 Niederlande</option>
                  <option value="🇧🇪">🇧🇪 Belgien</option>
                  <option value="🇬🇧">🇬🇧 Großbritannien</option>
                  <option value="🇺🇸">🇺🇸 USA</option>
                  <option value="🇯🇵">🇯🇵 Japan</option>
                  <option value="🇹🇭">🇹🇭 Thailand</option>
                  <option value="🌍">🌍 Andere</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 Start
                  </label>
                  <input
                    type="date"
                    value={newTripData.start_date}
                    onChange={(e) => setNewTripData({...newTripData, start_date: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 Ende
                  </label>
                  <input
                    type="date"
                    value={newTripData.end_date}
                    onChange={(e) => setNewTripData({...newTripData, end_date: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💰 Budget
                  </label>
                  <input
                    type="number"
                    value={newTripData.budget}
                    onChange={(e) => setNewTripData({...newTripData, budget: parseFloat(e.target.value)})}
                    placeholder="0"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💵 Währung
                  </label>
                  <select
                    value={newTripData.currency}
                    onChange={(e) => setNewTripData({...newTripData, currency: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={createNewTrip}
                disabled={!newTripData.name || !newTripData.destination || !newTripData.start_date || !newTripData.end_date}
                className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✨ Reise erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
}
