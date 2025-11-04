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
            { id: 'expenses', icon: '💰', label: 'Ausgaben' },
            { id: 'itinerary', icon: '🗓️', label: 'Plan' },
            { id: 'packing', icon: '🎒', label: 'Packliste' },
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
    case 'overview':
      return renderOverview()
    case 'expenses':
      return renderExpenses()
    case 'itinerary':
      return renderItinerary()
    case 'packing':
      return renderPacking()
    case 'settlement':
      return renderSettlement()
    case 'admin':
      return renderAdmin()
    default:
      return null
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
}
