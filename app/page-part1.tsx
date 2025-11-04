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

  // This function will be implemented in the next file part
  function renderTabContent() {
    return <div>Tab content will be here...</div>
  }
}
