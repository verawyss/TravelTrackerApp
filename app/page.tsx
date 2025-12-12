'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import PlacesAutocomplete from '@/components/PlacesAutocomplete'

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
  const [activeTab, setActiveTab] = useState('overview')
  const [allUserTrips, setAllUserTrips] = useState<any[]>([])
  const [currentTrip, setCurrentTrip] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  // ========== TRIPS STATE ==========
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [showEditTripModal, setShowEditTripModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<any>(null)
  const [tripStatusFilter, setTripStatusFilter] = useState<'all' | 'active' | 'finished' | 'archived'>('active')
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
  const [newUser, setNewUser] = useState({ 
    email: '', 
    password: '', 
    name: '',
    role: 'member' as 'admin' | 'member',
    addToTrips: [] as string[] // Trip IDs zu denen der User hinzugefügt wird
  })

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
    trip_id: '', // NEW: Trip-Zuordnung
    category: '🍕 Essen & Trinken',
    description: '',
    amount: '',
    paid_by: '',
    split_between: [] as string[],
    date: new Date().toISOString().split('T')[0]
  })
  
  // Separate state for external names input (to allow comma typing)
  const [externalNamesInput, setExternalNamesInput] = useState('')

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

// Aktualisierte Packing Categories mit mehr Optionen
const packingCategories = [
  { id: '👕 Kleidung', icon: '👕', label: 'Kleidung' },
  { id: '👟 Schuhe', icon: '👟', label: 'Schuhe' },
  { id: '📱 Elektronik', icon: '📱', label: 'Elektronik' },
  { id: '🧴 Körperpflege', icon: '🧴', label: 'Körperpflege' },
  { id: '💊 Medikamente', icon: '💊', label: 'Medikamente' },
  { id: '📄 Dokumente', icon: '📄', label: 'Dokumente' },
  { id: '💳 Finanzen', icon: '💳', label: 'Finanzen' },
  { id: '🏖️ Strand', icon: '🏖️', label: 'Strand' },
  { id: '⛷️ Winter/Sport', icon: '⛷️', label: 'Winter/Sport' },
  { id: '🎒 Ausrüstung', icon: '🎒', label: 'Ausrüstung' },
  { id: '📚 Unterhaltung', icon: '📚', label: 'Unterhaltung' },
  { id: '🍴 Essen/Snacks', icon: '🍴', label: 'Essen/Snacks' },
  { id: '🧸 Kinder', icon: '🧸', label: 'Kinder' },
  { id: '📝 Sonstiges', icon: '📝', label: 'Sonstiges' }
]

  // ========== ITINERARY STATE ==========
  const [itineraryItems, setItineraryItems] = useState<any[]>([])
  const [showItineraryModal, setShowItineraryModal] = useState(false)
  const [editingItineraryItem, setEditingItineraryItem] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [newItineraryItem, setNewItineraryItem] = useState({
    day: 1,
    time: '09:00',
    time_end: '',
    start_date: '',
    end_date: '',
    title: '',
    details: '',
    type: '🎯 Aktivität',
    address: '',
    phone: '',
    website: '',
    rating: 0,
    latitude: 0,
    longitude: 0,
    cost: 0,
    expense_id: null,
    // Split-Felder für Kostenteilung
    paid_by: '',
    split_between: [] as string[]
  })

  // =================================================================
// ERWEITERTE PACKLISTEN-VERWALTUNG MIT TEMPLATES
// Diesen Code in die page.tsx integrieren
// =================================================================

// ========== NEUE STATE VARIABLEN (zu den bestehenden hinzufügen) ==========

const [packingTemplates, setPackingTemplates] = useState<any[]>([])
const [otherTripsPackingLists, setOtherTripsPackingLists] = useState<any[]>([])
const [showTemplateModal, setShowTemplateModal] = useState(false)
const [showTemplateSelector, setShowTemplateSelector] = useState(false)
const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false)
const [editingTemplate, setEditingTemplate] = useState<any>(null)
const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
const [currentTripPackingList, setCurrentTripPackingList] = useState<any>(null)
const [packingStats, setPackingStats] = useState({
  total: 0,
  packed: 0,
  unpacked: 0,
  essential: 0,
  essentialPacked: 0,
  progress: 0
})

const [newTemplate, setNewTemplate] = useState({
  name: '',
  description: '',
  icon: '🎒',
  trip_type: '',
  is_public: false
})

const [saveTemplateData, setSaveTemplateData] = useState({
  name: '',
  description: '',
  icon: '🎒',
  is_public: false
})



const templateIcons = [
  '🎒', '🧳', '🏖️', '🏔️', '✈️', '🚗', '🏕️', '🏛️', 
  '🏖️', '⛷️', '🏄', '🚴', '🥾', '🎒', '💼', '🎓'
]

// ========== LOAD FUNCTIONS ==========

const loadPackingTemplates = useCallback(async () => {
  if (!currentUser) return
  
  try {
    const { data, error } = await supabase
      .from('packing_list_templates')
      .select('*')
      .or(`user_id.eq.${currentUser.id},is_public.eq.true`)
      .order('use_count', { ascending: false })
      .order('name')

    if (error) throw error
    setPackingTemplates(data || [])
  } catch (error) {
    console.error('Error loading templates:', error)
  }
}, [currentUser])

const loadOtherTripsPackingLists = useCallback(async () => {
  if (!currentUser || !currentTrip) return
  
  try {
    // Load all trips with their packing lists
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        name,
        flag,
        destination,
        status,
        trip_packing_lists!inner (
          id,
          name,
          created_at
        )
      `)
      .eq('created_by', currentUser.id)
      .neq('id', currentTrip.id) // Exclude current trip
      .order('created_at', { ascending: false })

    if (tripsError) throw tripsError

    // Flatten the structure
    const packingLists = trips?.map(trip => ({
      id: trip.trip_packing_lists[0].id,
      trip_id: trip.id,
      trip_name: trip.name,
      trip_flag: trip.flag,
      trip_destination: trip.destination,
      trip_status: trip.status,
      list_name: trip.trip_packing_lists[0].name,
      created_at: trip.trip_packing_lists[0].created_at
    })) || []

    setOtherTripsPackingLists(packingLists)
  } catch (error) {
    console.error('Error loading other trips packing lists:', error)
    setOtherTripsPackingLists([])
  }
}, [currentUser, currentTrip])

const loadTripPackingList = useCallback(async (tripId: string) => {
  if (!tripId) return
  
  try {
    // Check if packing list exists
    const { data: packingList, error: listError } = await supabase
      .from('trip_packing_lists')
      .select(`
        *,
        template:packing_list_templates(*)
      `)
      .eq('trip_id', tripId)
      .maybeSingle()

    if (listError) throw listError

    if (packingList) {
      // Load items
      const { data: items, error: itemsError } = await supabase
        .from('trip_packing_items')
        .select('*')
        .eq('trip_packing_list_id', packingList.id)
        .order('sort_order')

      if (itemsError) throw itemsError

      setCurrentTripPackingList(packingList)
      setPackingItems(items || [])
      updatePackingStats(items || [])
    } else {
      setCurrentTripPackingList(null)
      setPackingItems([])
      updatePackingStats([])
    }
  } catch (error) {
    console.error('Error loading packing list:', error)
  }
}, [])

const updatePackingStats = (items: any[]) => {
  const total = items.length
  const packed = items.filter(i => i.packed).length
  const essential = items.filter(i => i.essential).length
  const essentialPacked = items.filter(i => i.essential && i.packed).length

  setPackingStats({
    total,
    packed,
    unpacked: total - packed,
    essential,
    essentialPacked,
    progress: total > 0 ? Math.round((packed / total) * 100) : 0
  })
}

// ========== TEMPLATE MANAGEMENT ==========

const handleCreateTemplate = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!currentUser) return

  try {
    const { data, error } = await supabase
      .from('packing_list_templates')
      .insert({
        ...newTemplate,
        user_id: currentUser.id
      })
      .select()
      .single()

    if (error) throw error

    setShowTemplateModal(false)
    setNewTemplate({
      name: '',
      description: '',
      icon: '🎒',
      trip_type: '',
      is_public: false
    })
    await loadPackingTemplates()
    alert('✅ Template erstellt!')
  } catch (error) {
    console.error('Error creating template:', error)
    alert('❌ Fehler beim Erstellen des Templates')
  }
}

const handleEditTemplate = async (template: any) => {
  setEditingTemplate(template)
  setNewTemplate(template)
  setShowTemplateModal(true)
}

const handleUpdateTemplate = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!editingTemplate) return

  try {
    const { error } = await supabase
      .from('packing_list_templates')
      .update({
        ...newTemplate,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTemplate.id)

    if (error) throw error

    setShowTemplateModal(false)
    setEditingTemplate(null)
    setNewTemplate({
      name: '',
      description: '',
      icon: '🎒',
      trip_type: '',
      is_public: false
    })
    await loadPackingTemplates()
    alert('✅ Template aktualisiert!')
  } catch (error) {
    console.error('Error updating template:', error)
    alert('❌ Fehler beim Aktualisieren')
  }
}

const handleDeleteTemplate = async (templateId: string) => {
  if (!confirm('Template wirklich löschen?')) return

  try {
    const { error } = await supabase
      .from('packing_list_templates')
      .delete()
      .eq('id', templateId)

    if (error) throw error

    await loadPackingTemplates()
    alert('✅ Template gelöscht')
  } catch (error) {
    console.error('Error deleting template:', error)
    alert('❌ Fehler beim Löschen')
  }
}

// ========== TRIP PACKING LIST MANAGEMENT ==========

const handleCreatePackingList = async (templateId?: string, fromTripPackingListId?: string) => {
  if (!currentTrip) return

  try {
    if (templateId) {
      // Use SQL function to copy template
      const { data, error } = await supabase.rpc('copy_template_to_trip', {
        p_template_id: templateId,
        p_trip_id: currentTrip.id,
        p_list_name: currentTrip.name
      })

      if (error) throw error
    } else if (fromTripPackingListId) {
      // Copy from another trip's packing list
      // First, get the items from the source packing list
      const { data: sourceItems, error: itemsError } = await supabase
        .from('trip_packing_items')
        .select('*')
        .eq('trip_packing_list_id', fromTripPackingListId)

      if (itemsError) throw itemsError

      // Create new packing list for current trip
      const { data: newList, error: listError } = await supabase
        .from('trip_packing_lists')
        .insert({
          trip_id: currentTrip.id,
          name: currentTrip.name,
          created_from_template: false
        })
        .select()
        .single()

      if (listError) throw listError

      // Copy items to new list (reset packed status)
      if (sourceItems && sourceItems.length > 0) {
        const newItems = sourceItems.map(item => ({
          trip_packing_list_id: newList.id,
          category: item.category,
          item: item.item,
          essential: item.essential,
          packed: false, // Reset packed status
          quantity: item.quantity || 1,
          notes: item.notes,
          sort_order: item.sort_order
        }))

        const { error: insertError } = await supabase
          .from('trip_packing_items')
          .insert(newItems)

        if (insertError) throw insertError
      }
    } else {
      // Create empty list
      const { data, error } = await supabase
        .from('trip_packing_lists')
        .insert({
          trip_id: currentTrip.id,
          name: currentTrip.name,
          created_from_template: false
        })
        .select()
        .single()

      if (error) throw error
    }

    setShowTemplateSelector(false)
    await loadTripPackingList(currentTrip.id)
    alert('✅ Packliste erstellt!')
  } catch (error) {
    console.error('Error creating packing list:', error)
    alert('❌ Fehler beim Erstellen der Packliste')
  }
}

const handleSaveAsTemplate = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Validierung
  if (!currentUser) {
    setAuthMessage({ type: 'error', text: '❌ Nicht angemeldet!' })
    return
  }
  
  if (!currentTripPackingList) {
    setAuthMessage({ type: 'error', text: '❌ Keine Packliste vorhanden!' })
    return
  }
  
  if (packingItems.length === 0) {
    setAuthMessage({ type: 'error', text: '❌ Packliste ist leer!' })
    return
  }
  
  if (!saveTemplateData.name.trim()) {
    setAuthMessage({ type: 'error', text: '❌ Bitte einen Namen eingeben!' })
    return
  }

  setLoadingAction(true)
  try {
    // Create template
    const { data: template, error: templateError } = await supabase
      .from('packing_list_templates')
      .insert({
        name: saveTemplateData.name.trim(),
        description: saveTemplateData.description?.trim() || null,
        icon: saveTemplateData.icon,
        is_public: saveTemplateData.is_public,
        user_id: currentUser.id,
        use_count: 0
      })
      .select()
      .single()

    if (templateError) throw templateError

    // Copy items to template
    const itemsToInsert = packingItems.map((item, index) => ({
      template_id: template.id,
      category: item.category,
      item: item.item,
      essential: item.essential || false,
      quantity: item.quantity || 1,
      notes: item.notes || null,
      sort_order: index
    }))

    const { error: itemsError } = await supabase
      .from('packing_list_template_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // Success!
    setAuthMessage({ type: 'success', text: `✅ Template "${template.name}" gespeichert!` })
    setShowSaveAsTemplateModal(false)
    setSaveTemplateData({
      name: '',
      description: '',
      icon: '🎒',
      is_public: false
    })
    await loadPackingTemplates()
  } catch (error: any) {
    console.error('Error saving as template:', error)
    setAuthMessage({ type: 'error', text: `❌ Fehler: ${error.message}` })
  } finally {
    setLoadingAction(false)
  }
}

const handleAddPackingItem = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!currentTripPackingList) return

  try {
    const { data, error } = await supabase
      .from('trip_packing_items')
      .insert({
        trip_packing_list_id: currentTripPackingList.id,
        category: newPackingItem.category,
        item: newPackingItem.item,
        essential: newPackingItem.essential,
        packed: false,
        quantity: 1,
        sort_order: packingItems.length
      })
      .select()
      .single()

    if (error) throw error

    setShowPackingModal(false)
    setNewPackingItem({
      category: '👕 Kleidung',
      item: '',
      packed: false,
      essential: false
    })
    await loadTripPackingList(currentTrip!.id)
  } catch (error) {
    console.error('Error adding item:', error)
    alert('❌ Fehler beim Hinzufügen')
  }
}

const handleTogglePacked = async (item: any) => {
  try {
    const updates: any = {
      packed: !item.packed,
      packed_at: !item.packed ? new Date().toISOString() : null
    }

    if (!item.packed && currentUser) {
      updates.packed_by = currentUser.id
    } else if (item.packed) {
      updates.packed_by = null
    }

    const { error } = await supabase
      .from('trip_packing_items')
      .update(updates)
      .eq('id', item.id)

    if (error) throw error

    await loadTripPackingList(currentTrip!.id)
  } catch (error) {
    console.error('Error toggling packed:', error)
  }
}

const handleDeletePackingItem = async (itemId: string) => {
  if (!confirm('Item wirklich löschen?')) return

  try {
    const { error } = await supabase
      .from('trip_packing_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    await loadTripPackingList(currentTrip!.id)
  } catch (error) {
    console.error('Error deleting item:', error)
    alert('❌ Fehler beim Löschen')
  }
}

// ========== useEffect zum Laden ==========

useEffect(() => {
  if (currentUser) {
    loadPackingTemplates()
  }
}, [currentUser, loadPackingTemplates])

useEffect(() => {
  if (currentTrip && activeTab === 'packing') {
    loadTripPackingList(currentTrip.id)
  }
}, [currentTrip, activeTab, loadTripPackingList])

useEffect(() => {
  if (showTemplateSelector && currentUser && currentTrip) {
    loadOtherTripsPackingLists()
  }
}, [showTemplateSelector, currentUser, currentTrip, loadOtherTripsPackingLists])

// =================================================================
// UI COMPONENTS
// =================================================================

// ========== TEMPLATE SELECTOR MODAL ==========

const renderTemplateSelectorModal = () => {
  if (!showTemplateSelector) return null
  
  return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Packliste erstellen</h2>
          <button
            onClick={() => setShowTemplateSelector(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <p className="text-gray-600">
          Wähle eine Vorlage, kopiere von einer anderen Reise oder erstelle eine leere Liste
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Leere Packliste */}
        <div
          onClick={() => handleCreatePackingList()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📝</div>
            <h3 className="font-bold text-lg mb-1">Leere Packliste</h3>
            <p className="text-sm text-gray-600">
              Erstelle eine neue Packliste von Grund auf
            </p>
          </div>
        </div>

        {/* Packlisten von anderen Reisen */}
        {otherTripsPackingLists.length > 0 && (
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span>✈️</span> Aus anderen Reisen kopieren
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {otherTripsPackingLists.map(list => (
                <div
                  key={list.id}
                  onClick={() => handleCreatePackingList(undefined, list.id)}
                  className="border rounded-lg p-4 hover:border-teal-500 hover:bg-teal-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{list.trip_flag}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{list.trip_name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          list.trip_status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {list.trip_status === 'active' ? 'Aktiv' : 'Archiviert'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {list.trip_destination}
                      </p>
                      <div className="text-xs text-gray-500">
                        {new Date(list.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gespeicherte Templates */}
        {packingTemplates.length > 0 && (
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span>🎒</span> Aus gespeicherten Vorlagen
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {packingTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleCreatePackingList(template.id)}
                  className="border rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold">{template.name}</h4>
                        {template.is_public && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Öffentlich
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {template.description}
                        </p>
                      )}
                      {template.trip_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {template.trip_type}
                        </span>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {template.use_count}× verwendet
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keine anderen Listen vorhanden */}
        {otherTripsPackingLists.length === 0 && packingTemplates.length === 0 && (
          <div className="text-center py-8">
            <span className="text-6xl mb-4 block">🎒</span>
            <p className="text-gray-600 mb-2">
              Noch keine Vorlagen oder andere Reisen mit Packlisten vorhanden
            </p>
            <p className="text-sm text-gray-500">
              Erstelle eine leere Packliste oder speichere zukünftige Listen als Vorlagen
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  )
}

// ========== SAVE AS TEMPLATE MODAL ==========

const renderSaveAsTemplateModal = () => {
  if (!showSaveAsTemplateModal) return null
  
  return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-lg w-full">
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Als Template speichern</h2>
          <button
            onClick={() => setShowSaveAsTemplateModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Speichere diese Packliste als wiederverwendbares Template
        </p>
      </div>

      <form onSubmit={handleSaveAsTemplate} className="p-6 space-y-4">
        {/* Icon Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Icon</label>
          <div className="flex flex-wrap gap-2">
            {templateIcons.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setSaveTemplateData({ ...saveTemplateData, icon })}
                className={`text-2xl p-2 rounded hover:bg-gray-100 ${
                  saveTemplateData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name *</label>
          <input
            type="text"
            value={saveTemplateData.name}
            onChange={e => setSaveTemplateData({ ...saveTemplateData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="z.B. Strandurlaub, Städtetrip"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Beschreibung</label>
          <textarea
            value={saveTemplateData.description}
            onChange={e => setSaveTemplateData({ ...saveTemplateData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
            rows={3}
            placeholder="Wofür ist dieses Template gedacht?"
          />
        </div>

        {/* Public */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_public"
            checked={saveTemplateData.is_public}
            onChange={e => setSaveTemplateData({ ...saveTemplateData, is_public: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="is_public" className="text-sm">
            Als öffentliches Template teilen
          </label>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          📋 Es werden alle {packingItems.length} Items aus der aktuellen Packliste übernommen
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setShowSaveAsTemplateModal(false)
              setSaveTemplateData({
                name: '',
                description: '',
                icon: '🎒',
                is_public: false
              })
            }}
            disabled={loadingAction}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loadingAction || !saveTemplateData.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAction ? 'Speichere...' : 'Template speichern'}
          </button>
        </div>
      </form>
    </div>
  </div>
  )
}

// ========== PACKING LIST VIEW ==========

const PackingListView = () => {
  if (!currentTripPackingList) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎒</div>
        <h3 className="text-xl font-bold mb-2">Keine Packliste vorhanden</h3>
        <p className="text-gray-600 mb-6">
          Erstelle eine neue Packliste oder verwende ein Template
        </p>
        <button
          onClick={() => setShowTemplateSelector(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Packliste erstellen
        </button>
      </div>
    )
  }

  // Group items by category
  const groupedItems = packingItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, any[]>)

const filteredCategories = (Object.entries(groupedItems) as [string, any[]][]).filter(([_, items]) => {
  const itemsArray = items as any[]
  if (packingFilter === 'all') return true
  if (packingFilter === 'packed') return itemsArray.some(i => i.packed)
  if (packingFilter === 'unpacked') return itemsArray.some(i => !i.packed)
  if (packingFilter === 'essential') return itemsArray.some(i => i.essential)
  return true
})

  return (
    <div>
      {/* Header with Stats */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{currentTripPackingList.name}</h2>
            {currentTripPackingList.template && (
              <p className="text-sm text-gray-600">
                📋 Basiert auf Template: {currentTripPackingList.template.name}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowSaveAsTemplateModal(true)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            💾 Als Template speichern
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Fortschritt</span>
            <span className="font-bold">{packingStats.progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${packingStats.progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{packingStats.total}</div>
            <div className="text-xs text-gray-600">Gesamt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{packingStats.packed}</div>
            <div className="text-xs text-gray-600">Gepackt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{packingStats.unpacked}</div>
            <div className="text-xs text-gray-600">Offen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {packingStats.essential - packingStats.essentialPacked}
            </div>
            <div className="text-xs text-gray-600">Wichtig offen</div>
          </div>
        </div>
      </div>

      {/* Filter & Actions */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          {['all', 'unpacked', 'packed', 'essential'].map(filter => (
            <button
              key={filter}
              onClick={() => setPackingFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm ${
                packingFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              {filter === 'all' && 'Alle'}
              {filter === 'unpacked' && 'Offen'}
              {filter === 'packed' && 'Gepackt'}
              {filter === 'essential' && 'Wichtig'}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setEditingPackingItem(null)
            setShowPackingModal(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Item hinzufügen
        </button>
      </div>

      {/* Items by Category */}
      <div className="space-y-4">
        {filteredCategories.map(([category, items]: [string, any[]]) => {
          const visibleItems = items.filter(item => {
            if (packingFilter === 'packed') return item.packed
            if (packingFilter === 'unpacked') return !item.packed
            if (packingFilter === 'essential') return item.essential
            return true
          })

          if (visibleItems.length === 0) return null

          const packedCount = items.filter(i => i.packed).length

          return (
            <div key={category} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <span>{category}</span>
                  <span className="text-sm font-normal text-gray-500">
                    ({packedCount}/{items.length})
                  </span>
                </h3>
              </div>

              <div className="space-y-2">
                {visibleItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      item.packed
                        ? 'bg-green-50 border-green-200'
                        : item.essential
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => handleTogglePacked(item)}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${item.packed ? 'line-through text-gray-500' : ''}`}>
                        {item.item}
                        {item.quantity > 1 && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({item.quantity}×)
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <div className="text-sm text-gray-600 mt-1">{item.notes}</div>
                      )}
                    </div>
                    {item.essential && !item.packed && (
                      <span className="text-red-600 text-xl">⚠️</span>
                    )}
                    <button
                      onClick={() => handleDeletePackingItem(item.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {packingItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Noch keine Items in der Packliste
        </div>
      )}
    </div>
  )
}

  // ========== LOCATION AUTOCOMPLETE STATE (für Itinerary) ==========
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocations, setIsSearchingLocations] = useState(false)
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const itineraryTypes = [
    { id: '🍳 Frühstück', icon: '🍳', label: 'Frühstück' },
    { id: '☕ Kaffee/Snack', icon: '☕', label: 'Kaffee/Snack' },
    { id: '🍕 Mittagessen', icon: '🍕', label: 'Mittagessen' },
    { id: '🍽️ Abendessen', icon: '🍽️', label: 'Abendessen' },
    { id: '🍷 Bar/Drinks', icon: '🍷', label: 'Bar/Drinks' },
    { id: '🚗 Transport', icon: '🚗', label: 'Transport' },
    { id: '✈️ Flug', icon: '✈️', label: 'Flug' },
    { id: '🚂 Zug/Bus', icon: '🚂', label: 'Zug/Bus' },
    { id: '🚕 Taxi/Uber', icon: '🚕', label: 'Taxi/Uber' },
    { id: '🏨 Hotel', icon: '🏨', label: 'Hotel' },
    { id: '🎯 Aktivität', icon: '🎯', label: 'Aktivität' },
    { id: '🎨 Museum/Kultur', icon: '🎨', label: 'Museum/Kultur' },
    { id: '🎭 Show/Event', icon: '🎭', label: 'Show/Event' },
    { id: '🎢 Vergnügungspark', icon: '🎢', label: 'Vergnügungspark' },
    { id: '⚽ Sport', icon: '⚽', label: 'Sport' },
    { id: '🏖️ Strand/Pool', icon: '🏖️', label: 'Strand/Pool' },
    { id: '🌳 Natur/Wandern', icon: '🌳', label: 'Natur/Wandern' },
    { id: '📸 Sehenswürdigkeit', icon: '📸', label: 'Sehenswürdigkeit' },
    { id: '🛍️ Shopping', icon: '🛍️', label: 'Shopping' },
    { id: '💆 Wellness/Spa', icon: '💆', label: 'Wellness/Spa' },
    { id: '💤 Pause/Freizeit', icon: '💤', label: 'Pause/Freizeit' },
    { id: '📞 Termin/Meeting', icon: '📞', label: 'Termin/Meeting' },
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

      // Auto-archive finished trips
      if (data && data.length > 0) {
        const finishedActiveTrips = data.filter(trip => 
          trip.status === 'active' && trip.end_date && isTripFinished(trip)
        )
        if (finishedActiveTrips.length > 0) {
          console.log(`📦 Auto-archiving ${finishedActiveTrips.length} finished trips`)
          // Auto-archive in background
          setTimeout(() => autoArchiveFinishedTrips(), 1000)
        }
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

  const toggleTripArchiveStatus = async (tripId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active'
    const actionText = newStatus === 'archived' ? 'archiviert' : 'wieder aktiviert'
    
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', tripId)

      if (error) throw error

      setAuthMessage({ type: 'success', text: `✅ Reise ${actionText}!` })
      await loadAllTrips()
      
      // Update currentTrip if it's the one being toggled
      if (currentTrip?.id === tripId) {
        setCurrentTrip({ ...currentTrip, status: newStatus })
      }
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
    }
  }

  // Check if trip is finished based on end_date
  const isTripFinished = (trip: any) => {
    if (!trip.end_date) return false
    const endDate = new Date(trip.end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return endDate < today
  }

  // Auto-archive finished trips
  const autoArchiveFinishedTrips = async () => {
    try {
      const tripsToArchive = allUserTrips.filter(trip => 
        trip.status === 'active' && isTripFinished(trip)
      )

      if (tripsToArchive.length === 0) return

      const tripIds = tripsToArchive.map(t => t.id)
      const { error } = await supabase
        .from('trips')
        .update({ status: 'archived' })
        .in('id', tripIds)

      if (error) throw error

      if (tripsToArchive.length > 0) {
        setAuthMessage({ 
          type: 'success', 
          text: `✅ ${tripsToArchive.length} abgeschlossene Reise(n) automatisch archiviert!` 
        })
        await loadAllTrips()
      }
    } catch (error: any) {
      console.error('Auto-archive error:', error)
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
// ========== NEUE ADMIN FUNCTIONS ==========
const addMemberToTrip = async () => {
  if (!memberToAdd || !selectedTripForAdmin) {
    setAuthMessage({ type: 'error', text: '❌ Bitte Benutzer auswählen' })
    return
  }

  setLoadingAction(true)
  try {
    const { data: existing } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', selectedTripForAdmin)
      .eq('user_id', memberToAdd)
      .single()

    if (existing) {
      setAuthMessage({ type: 'error', text: '❌ Benutzer ist bereits Mitglied' })
      setLoadingAction(false)
      return
    }

    const { error } = await supabase
      .from('trip_members')
      .insert({
        trip_id: selectedTripForAdmin,
        user_id: memberToAdd,
        role: memberRoleToAdd
      })

    if (error) throw error

    setAuthMessage({ type: 'success', text: '✅ Mitglied hinzugefügt!' })
    await loadTripMembers(selectedTripForAdmin)
    setShowAddMemberToTripModal(false)
    setMemberToAdd('')
  } catch (error: any) {
    setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
  } finally {
    setLoadingAction(false)
  }
}

const removeMemberFromTrip = async (tripId: string, userId: string) => {
  if (!confirm('Mitglied aus dieser Reise entfernen?')) return

  try {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)

    if (error) throw error

    setAuthMessage({ type: 'success', text: '✅ Mitglied entfernt!' })
    await loadTripMembers(tripId)
  } catch (error: any) {
    setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
  }
}

const updateMemberRole = async (tripId: string, userId: string, newRole: string) => {
  try {
    const { error } = await supabase
      .from('trip_members')
      .update({ role: newRole })
      .eq('trip_id', tripId)
      .eq('user_id', userId)

    if (error) throw error

    setAuthMessage({ type: 'success', text: '✅ Rolle aktualisiert!' })
    await loadTripMembers(tripId)
  } catch (error: any) {
    setAuthMessage({ type: 'error', text: `❌ ${error.message}` })
  }
}
    setLoadingAction(true)
    try {
      // 1. Erstelle Benutzer mit Rolle
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role
        })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Fehler beim Erstellen')

      // 2. Füge Benutzer zu ausgewählten Reisen hinzu
      if (newUser.addToTrips.length > 0) {
        for (const tripId of newUser.addToTrips) {
          const { error: memberError } = await supabase
            .from('trip_members')
            .insert({
              trip_id: tripId,
              user_id: result.user.id,
              role: 'member'
            })
          
          if (memberError) {
            console.error('Error adding to trip:', memberError)
          }
        }
      }

      setAuthMessage({ 
        type: 'success', 
        text: `✅ Benutzer erstellt! ${newUser.addToTrips.length > 0 ? `Zu ${newUser.addToTrips.length} Reise(n) hinzugefügt.` : ''}`
      })
      
      await loadUsers()
      setShowAddUserModal(false)
      setNewUser({ 
        email: '', 
        password: '', 
        name: '',
        role: 'member',
        addToTrips: []
      })
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
  const loadTripMembers = useCallback(async (tripId: string) => {
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
  }, [])

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

  const loadPendingInvitations = useCallback(async (tripId: string) => {
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
  }, [])

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
  const loadExpenses = useCallback(async (tripId: string) => {
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
  }, [])

  const createOrUpdateExpense = async () => {
    if (!newExpense.trip_id) {
      setAuthMessage({ type: 'error', text: '❌ Bitte eine Reise auswählen!' })
      return
    }

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
        trip_id: newExpense.trip_id, // Use selected trip instead of currentTrip
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

      // Reload expenses for the current trip (if it's the same)
      if (currentTrip && currentTrip.id === newExpense.trip_id) {
        await loadExpenses(currentTrip.id)
      }
      
      setShowExpenseModal(false)
      setEditingExpense(null)
      setExternalNamesInput('') // Reset external names input
      setNewExpense({
        trip_id: currentTrip?.id || '', // Pre-select current trip for next expense
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
  const loadItineraryItems = useCallback(async (tripId: string) => {
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
  }, [])

  const createOrUpdateItineraryItem = async () => {
    if (!newItineraryItem.title.trim()) {
      setAuthMessage({ type: 'error', text: '❌ Bitte einen Titel eingeben!' })
      return
    }

    if (!currentTrip) {
      setAuthMessage({ type: 'error', text: '❌ Keine Reise ausgewählt!' })
      return
    }

    // Validierung für Kostenteilung
    if (newItineraryItem.cost > 0) {
      if (!newItineraryItem.paid_by) {
        setAuthMessage({ type: 'error', text: '❌ Bitte wähle wer die Kosten bezahlt hat!' })
        return
      }
      if (newItineraryItem.split_between.length === 0) {
        setAuthMessage({ type: 'error', text: '❌ Bitte wähle mindestens eine Person für die Kostenteilung!' })
        return
      }
    }

    setLoadingAction(true)
    try {
      let expenseId = editingItineraryItem?.expense_id || null

      // Wenn Kosten angegeben sind, erstelle/update Expense
      if (newItineraryItem.cost > 0) {
        const expenseData = {
          trip_id: currentTrip.id,
          category: newItineraryItem.type || '🎯 Aktivität',
          description: newItineraryItem.title.trim(),
          amount: newItineraryItem.cost,
          paid_by: newItineraryItem.paid_by,
          split_between: newItineraryItem.split_between,
          date: newItineraryItem.start_date || new Date().toISOString().split('T')[0]
        }

        if (expenseId) {
          // Update bestehende Expense
          const { error } = await supabase
            .from('expenses')
            .update(expenseData)
            .eq('id', expenseId)
          
          if (error) throw error
        } else {
          // Erstelle neue Expense
          const { data, error } = await supabase
            .from('expenses')
            .insert(expenseData)
            .select()
            .single()
          
          if (error) throw error
          expenseId = data.id
        }
      } else if (expenseId) {
        // Wenn Kosten entfernt wurden, lösche die verknüpfte Expense
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId)
        
        if (error) throw error
        expenseId = null
      }

      // Erstelle/Update Itinerary Item
      const itineraryData = {
        trip_id: currentTrip.id,
        day: newItineraryItem.day,
        time: newItineraryItem.time,
        time_end: newItineraryItem.time_end || null,
        start_date: newItineraryItem.start_date || null,
        end_date: newItineraryItem.end_date || null,
        title: newItineraryItem.title.trim(),
        details: newItineraryItem.details.trim(),
        type: newItineraryItem.type,
        address: newItineraryItem.address || null,
        phone: newItineraryItem.phone || null,
        website: newItineraryItem.website || null,
        rating: newItineraryItem.rating || 0,
        latitude: newItineraryItem.latitude || 0,
        longitude: newItineraryItem.longitude || 0,
        cost: newItineraryItem.cost || 0,
        expense_id: expenseId
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

      // Reload data
      await loadItineraryItems(currentTrip.id)
      if (newItineraryItem.cost > 0) {
        await loadExpenses(currentTrip.id)
      }
      
      setShowItineraryModal(false)
      setEditingItineraryItem(null)
      setNewItineraryItem({
        day: selectedDay,
        time: '09:00',
        time_end: '',
        start_date: '',
        end_date: '',
        title: '',
        details: '',
        type: '🎯 Aktivität',
        address: '',
        phone: '',
        website: '',
        rating: 0,
        latitude: 0,
        longitude: 0,
        cost: 0,
        expense_id: null,
        paid_by: '',
        split_between: []
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
    if (!currentTrip || !currentTrip.start_date) {
      return itineraryItems
        .filter(item => item.day === day)
        .sort((a, b) => a.time.localeCompare(b.time))
    }

    // Get the actual date for this day
    const tripStartDate = new Date(currentTrip.start_date)
    const currentDayDate = new Date(tripStartDate)
    currentDayDate.setDate(tripStartDate.getDate() + day - 1)

    return itineraryItems
      .filter(item => {
        // Always include items that belong to this day
        if (item.day === day) return true
        
        // Check if this item is a multi-day event that spans to this day
        if (item.end_date) {
          const itemStartDate = new Date(tripStartDate)
          itemStartDate.setDate(tripStartDate.getDate() + item.day - 1)
          const itemEndDate = new Date(item.end_date)
          
          // Check if currentDayDate is between itemStartDate and itemEndDate
          return currentDayDate >= itemStartDate && currentDayDate <= itemEndDate
        }
        
        return false
      })
      .sort((a, b) => {
        // Sort by time, but put multi-day events first if they started on a previous day
        if (a.day !== day && b.day === day) return -1
        if (a.day === day && b.day !== day) return 1
        return a.time.localeCompare(b.time)
      })
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
  const loadLocations = useCallback(async (tripId: string) => {
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
  }, [])

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
        await loadLocations(currentTrip.id)
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
      loadTripPackingList(currentTrip.id)
      loadItineraryItems(currentTrip.id)
      loadLocations(currentTrip.id)
      loadPendingInvitations(currentTrip.id)
    }
  }, [currentTrip, loadTripMembers, loadExpenses, loadTripPackingList, loadItineraryItems, loadLocations, loadPendingInvitations])

  // ========== RENDER FUNCTIONS ==========
  const renderOverview = () => {
    const totalExpenses = currentTrip ? expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0) : 0
    const packingProgress = currentTrip ? getPackingProgress() : 0
    const totalActivities = currentTrip ? itineraryItems.length : 0
    const tripDays = currentTrip ? getTripDays() : []

    // Filter active trips for dropdown
    const activeTrips = allUserTrips.filter(t => t.status === 'active' || !isTripFinished(t))

    return (
      <div className="space-y-6">
        {/* Trip Selector */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reise auswählen
              </label>
              <select
                value={currentTrip?.id || ''}
                onChange={(e) => {
                  const trip = allUserTrips.find(t => t.id === e.target.value)
                  setCurrentTrip(trip || null)
                }}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 text-lg"
              >
                <option value="">-- Reise auswählen --</option>
                {activeTrips.map(trip => (
                  <option key={trip.id} value={trip.id}>
                    {trip.flag} {trip.name} - {trip.destination}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewTripModal(true)}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xl">+</span> Neue Reise
            </button>
          </div>
        </div>

        {!currentTrip ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">🌍</span>
            <p className="text-gray-600 mb-4">Keine Reise ausgewählt</p>
            <p className="text-sm text-gray-500">
              Wähle eine Reise aus dem Dropdown oder erstelle eine neue
            </p>
          </div>
        ) : (
          <>
            {/* Trip Info Card */}
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

            {/* Stats Grid */}
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
          </>
        )}
      </div>
    )
  }

  const renderTripsTab = () => {
    // Filter trips based on status
    const filteredTrips = tripStatusFilter === 'all' 
      ? allUserTrips 
      : tripStatusFilter === 'active'
      ? allUserTrips.filter(trip => trip.status === 'active' && !isTripFinished(trip))
      : tripStatusFilter === 'finished'
      ? allUserTrips.filter(trip => trip.status === 'active' && isTripFinished(trip))
      : allUserTrips.filter(trip => trip.status === 'archived')

    const activeCount = allUserTrips.filter(t => t.status === 'active' && !isTripFinished(t)).length
    const finishedCount = allUserTrips.filter(t => t.status === 'active' && isTripFinished(t)).length
    const archivedCount = allUserTrips.filter(t => t.status === 'archived').length

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

        {/* Filter Buttons */}
        <div className="flex gap-2 bg-white rounded-lg shadow p-2 overflow-x-auto">
          <button
            onClick={() => setTripStatusFilter('active')}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg font-medium transition-all ${
              tripStatusFilter === 'active'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              🟢 Aktiv
              {activeCount > 0 && (
                <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">
                  {activeCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTripStatusFilter('finished')}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg font-medium transition-all ${
              tripStatusFilter === 'finished'
                ? 'bg-orange-100 text-orange-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              ⏰ Abgeschlossen
              {finishedCount > 0 && (
                <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full text-xs font-bold">
                  {finishedCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTripStatusFilter('archived')}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg font-medium transition-all ${
              tripStatusFilter === 'archived'
                ? 'bg-gray-100 text-gray-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              📦 Archiviert
              {archivedCount > 0 && (
                <span className="bg-gray-300 text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold">
                  {archivedCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setTripStatusFilter('all')}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg font-medium transition-all ${
              tripStatusFilter === 'all'
                ? 'bg-teal-100 text-teal-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              📋 Alle
              {allUserTrips.length > 0 && (
                <span className="bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full text-xs font-bold">
                  {allUserTrips.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <span className="text-6xl mb-4 block">
              {tripStatusFilter === 'archived' ? '📦' : tripStatusFilter === 'finished' ? '⏰' : '✈️'}
            </span>
            <p className="text-gray-600 mb-4">
              {tripStatusFilter === 'archived' 
                ? 'Keine archivierten Reisen' 
                : tripStatusFilter === 'finished'
                ? 'Keine abgeschlossenen Reisen'
                : tripStatusFilter === 'active'
                ? 'Noch keine aktiven Reisen'
                : 'Noch keine Reisen geplant'}
            </p>
            {tripStatusFilter === 'active' && (
              <button
                onClick={() => setShowNewTripModal(true)}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Erste Reise erstellen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map(trip => (
              <div
                key={trip.id}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
                  currentTrip?.id === trip.id ? 'ring-2 ring-teal-600' : 'hover:shadow-lg'
                } ${trip.status === 'archived' ? 'opacity-75' : ''}`}
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
                        toggleTripArchiveStatus(trip.id, trip.status)
                      }}
                      className={`p-2 rounded transition-colors ${
                        trip.status === 'active' 
                          ? 'hover:bg-gray-100 text-gray-600' 
                          : 'hover:bg-green-100 text-green-600'
                      }`}
                      title={trip.status === 'active' ? 'Archivieren' : 'Reaktivieren'}
                    >
                      {trip.status === 'active' ? '📦' : '🔄'}
                    </button>
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
                    {trip.status === 'active' && isTripFinished(trip) && (
                      <span className="ml-2 text-orange-600 font-medium">
                        ⏰ Abgeschlossen
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className={`px-2 py-1 rounded ${
                    trip.status === 'active' 
                      ? isTripFinished(trip)
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {trip.status === 'active' 
                      ? isTripFinished(trip) 
                        ? '⏰ Abgeschlossen' 
                        : '🟢 Aktiv'
                      : '📦 Archiviert'}
                  </span>
                  <span className="text-gray-600">
                    👥 {trip.memberCount || 0} Mitglieder
                  </span>
                  {trip.status === 'active' && isTripFinished(trip) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTripArchiveStatus(trip.id, trip.status)
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                    >
                      Jetzt archivieren
                    </button>
                  )}
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
                  trip_id: currentTrip?.id || '', // Pre-select current trip
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-gray-600">Gesamt</div>
              <div className="text-3xl font-bold">
                {totalAmount.toFixed(2)} {currentTrip.currency}
              </div>
            </div>
            <div className="flex gap-2">
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
                      {/* Show trip info if expense is from different trip */}
                      {expense.trip_id !== currentTrip?.id && (() => {
                        const expenseTrip = allUserTrips.find(t => t.id === expense.trip_id)
                        return expenseTrip ? (
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded mb-1 w-fit">
                            <span>{expenseTrip.flag}</span>
                            <span className="font-medium">{expenseTrip.name}</span>
                          </div>
                        ) : null
                      })()}
                      <div>💳 Bezahlt von: {expense.paid_by}</div>
                      <div>👥 Geteilt zwischen: {expense.split_between.join(', ')}</div>
                      <div>📅 {new Date(expense.date).toLocaleDateString('de-DE')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {parseFloat(expense.amount.toString()).toFixed(2)} {
                        (() => {
                          const expenseTrip = allUserTrips.find(t => t.id === expense.trip_id)
                          return expenseTrip?.currency || currentTrip?.currency || 'EUR'
                        })()
                      }
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          setEditingExpense(expense)
                          setNewExpense({
                            trip_id: expense.trip_id, // Use expense's trip_id when editing
                            category: expense.category,
                            description: expense.description,
                            amount: expense.amount.toString(),
                            paid_by: expense.paid_by,
                            split_between: expense.split_between,
                            date: expense.date
                          })
                          
                          // Load external names into input field
                          const memberNames = tripMembers
                            .filter(m => m.trip_id === expense.trip_id)
                            .map(m => users.find(u => u.id === m.user_id)?.name || 'Unbekannt')
                          const externalNames = expense.split_between.filter((name: string) => !memberNames.includes(name))
                          setExternalNamesInput(externalNames.join(', '))
                          
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
          <div className="flex gap-2">
            {packingItems.length === 0 && (
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                📋 Aus Vorlage erstellen
              </button>
            )}
            {/* Show save as template button always when items exist */}
            {packingItems.length > 0 && (
              <button
                onClick={() => setShowSaveAsTemplateModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                💾 Als Vorlage speichern
              </button>
            )}
            {/* Only show add item if trip is not archived */}
            {currentTrip.status !== 'archived' && (
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
            )}
          </div>
        </div>

        {/* Info für archivierte Reisen */}
        {currentTrip.status === 'archived' && packingItems.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Archivierte Reise (Nur Ansicht)
                </h3>
                <p className="text-sm text-blue-700">
                  Diese Reise ist archiviert. Du kannst die Packliste ansehen und als Vorlage speichern,
                  aber keine Änderungen mehr vornehmen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Card wenn Packliste leer */}
        {packingItems.length === 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 mb-1">
                  Keine Packliste für diese Reise
                </h3>
                <p className="text-sm text-purple-700 mb-3">
                  Du kannst entweder eine Vorlage verwenden oder einzelne Items manuell hinzufügen.
                </p>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="text-sm px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  📋 Vorlage auswählen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Packliste Options - nur wenn Items vorhanden */}
        {packingItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Packliste für:</span>
                <span className="font-semibold">{currentTrip.flag} {currentTrip.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (confirm('⚠️ Möchtest du eine andere Vorlage laden? Die aktuelle Packliste wird ersetzt!')) {
                      // Delete current packing list first
                      supabase
                        .from('trip_packing_lists')
                        .delete()
                        .eq('trip_id', currentTrip.id)
                        .then(() => {
                          setPackingItems([])
                          setCurrentTripPackingList(null)
                          setShowTemplateSelector(true)
                        })
                    }
                  }}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm flex items-center gap-2"
                >
                  📋 Andere Vorlage laden
                </button>
                <button
                  onClick={() => setShowSaveAsTemplateModal(true)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-2"
                >
                  💾 Als Vorlage speichern
                </button>
              </div>
            </div>
          </div>
        )}

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
                          disabled={currentTrip.status === 'archived'}
                          className={`w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 ${
                            currentTrip.status === 'archived' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        />
                        <div className="flex-1">
                          <span className={`${item.packed ? 'line-through text-gray-500' : ''}`}>
                            {item.item}
                          </span>
                          {item.essential && (
                            <span className="ml-2 text-yellow-500">⭐</span>
                          )}
                        </div>
                        {currentTrip.status !== 'archived' && (
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
                        )}
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
                time_end: '',
                start_date: '',
                end_date: '',
                title: '',
                details: '',
                type: '🎯 Aktivität',
                address: '',
                phone: '',
                website: '',
                rating: 0,
                latitude: 0,
                longitude: 0,
                cost: 0,
                expense_id: null,
                paid_by: '',
                split_between: []
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
                        time_end: '',
                        start_date: '',
                        end_date: '',
                        title: '',
                        details: '',
                        type: '🎯 Aktivität',
                        address: '',
                        phone: '',
                        website: '',
                        rating: 0,
                        latitude: 0,
                        longitude: 0,
                        cost: 0,
                        expense_id: null,
                        paid_by: '',
                        split_between: []
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
              
              // Calculate which day of the multi-day event this is
              const isMultiDay = item.end_date && item.day !== selectedDay
              let multiDayInfo = null
              
              if (item.end_date && currentTrip?.start_date) {
                const tripStartDate = new Date(currentTrip.start_date)
                const itemStartDate = new Date(tripStartDate)
                itemStartDate.setDate(tripStartDate.getDate() + item.day - 1)
                const itemEndDate = new Date(item.end_date)
                const currentDayDate = new Date(tripStartDate)
                currentDayDate.setDate(tripStartDate.getDate() + selectedDay - 1)
                
                const totalDays = Math.ceil((itemEndDate.getTime() - itemStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                const currentDayOfEvent = Math.ceil((currentDayDate.getTime() - itemStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                
                multiDayInfo = {
                  currentDay: currentDayOfEvent,
                  totalDays: totalDays,
                  isFirstDay: item.day === selectedDay,
                  isLastDay: currentDayDate.getTime() === itemEndDate.getTime()
                }
              }
              
              return (
                <div 
                  key={item.id} 
                  className={`rounded-lg shadow ${
                    isMultiDay ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Time column */}
                      <div className="flex-shrink-0 text-center">
                        <div className="text-2xl font-bold text-teal-600">
                          {item.time}
                          {item.time_end && (
                            <>
                              <br />
                              <span className="text-sm text-gray-400">bis</span>
                              <br />
                              {item.time_end}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {index + 1}. Aktivität
                        </div>
                        {/* Show date range if end_date exists */}
                        {item.end_date && (
                          <div className="text-xs text-blue-600 mt-2 font-medium">
                            📅 Mehrtägig
                            <div className="text-xs text-gray-600 mt-0.5">
                              bis {new Date(item.end_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </div>
                          </div>
                        )}
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
                        {/* Multi-day event indicator */}
                        {multiDayInfo && (
                          <div className="mb-2 inline-block">
                            <span className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full font-medium">
                              {multiDayInfo.isFirstDay ? '🎬 Start' : 
                               multiDayInfo.isLastDay ? '🏁 Ende' : 
                               `📅 Tag ${multiDayInfo.currentDay}/${multiDayInfo.totalDays}`}
                            </span>
                          </div>
                        )}
                        
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
                            
                            {/* ✅ NEU: Adresse, Telefon, Website anzeigen */}
                            {(item.address || item.phone || item.website) && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                {item.address && (
                                  <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <span>📍</span>
                                    <span>{item.address}</span>
                                  </div>
                                )}
                                
                                {item.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <a 
                                      href={`tel:${item.phone}`} 
                                      className="text-teal-600 hover:underline flex items-center gap-1"
                                    >
                                      📞 {item.phone}
                                    </a>
                                  </div>
                                )}
                                
                                {item.website && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <a 
                                      href={item.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-teal-600 hover:underline flex items-center gap-1"
                                    >
                                      🌐 Website ↗
                                    </a>
                                  </div>
                                )}
                              </div>
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
                              onClick={async () => {
                                setEditingItineraryItem(item)
                                
                                // Load split data from expense if exists
                                let paid_by = ''
                                let split_between: string[] = []
                                
                                if (item.expense_id) {
                                  const { data: expense } = await supabase
                                    .from('expenses')
                                    .select('paid_by, split_between')
                                    .eq('id', item.expense_id)
                                    .single()
                                  
                                  if (expense) {
                                    paid_by = expense.paid_by
                                    split_between = expense.split_between
                                  }
                                }
                                
                                setNewItineraryItem({
                                  day: item.day,
                                  time: item.time,
                                  time_end: item.time_end || '',
                                  start_date: item.start_date || '',
                                  end_date: item.end_date || '',
                                  title: item.title,
                                  details: item.details,
                                  type: item.type,
                                  address: item.address || '',
                                  phone: item.phone || '',
                                  website: item.website || '',
                                  rating: item.rating || 0,
                                  latitude: item.latitude || 0,
                                  longitude: item.longitude || 0,
                                  cost: item.cost || 0,
                                  expense_id: item.expense_id || null,
                                  paid_by,
                                  split_between
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

// Filter items: Itinerary mit Adresse ODER Expenses mit verknüpftem Item
const itemsWithAddress = itineraryItems.filter(item => 
  item.address && item.address.trim() !== ''
)

// Zeige auch, welche Kosten haben
{itemsWithAddress.map(item => (
  <div key={item.id} className="...">
    {/* ... existing content ... */}
    
    {/* Zeige Kosten falls vorhanden */}
    {item.cost > 0 && (
      <div className="flex items-center gap-2 text-sm font-medium text-green-600 mt-2">
        <span>💰</span>
        <span>{item.cost.toFixed(2)} CHF</span>
      </div>
    )}
  </div>
))}

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">🗺️ Alle Orte aus dem Reiseplan</h2>
          <p className="text-sm text-gray-600 mb-6">
            {itemsWithAddress.length} Ort(e) • Sortiert nach Tag und Zeit
          </p>

          {/* List of places */}
          <div className="space-y-3">
            {itemsWithAddress
              .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
              .map(item => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{item.type.split(' ')[0]}</span>
                        <div>
                          <h3 className="font-bold text-lg">{item.title}</h3>
                          <p className="text-sm text-gray-600">
                            Tag {item.day} • {item.time}
                            {item.time_end && ` - ${item.time_end}`}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-1 mt-3">
                        {/* Address */}
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-gray-600">📍</span>
                          <span className="flex-1">{item.address}</span>
                        </div>

                        {/* Phone */}
                        {item.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">📞</span>
                            <a 
                              href={`tel:${item.phone}`} 
                              className="text-teal-600 hover:underline"
                            >
                              {item.phone}
                            </a>
                          </div>
                        )}

                        {/* Website */}
                        {item.website && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">🌐</span>
                            <a 
                              href={item.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:underline"
                            >
                              Website ↗
                            </a>
                          </div>
                        )}

                        {/* Details/Notes */}
                        {item.details && (
                          <div className="flex items-start gap-2 text-sm mt-2 pt-2 border-t">
                            <span className="text-gray-600">📝</span>
                            <span className="flex-1 text-gray-600">{item.details}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Map button */}
                    <div className="flex flex-col gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium whitespace-nowrap text-center"
                      >
                        🗺️ Karte
                      </a>
                      
                      {/* Edit button */}
                      <button
                        onClick={async () => {
                          setEditingItineraryItem(item)
                          
                          // Load split data from expense if exists
                          let paid_by = ''
                          let split_between: string[] = []
                          
                          if (item.expense_id) {
                            const { data: expense } = await supabase
                              .from('expenses')
                              .select('paid_by, split_between')
                              .eq('id', item.expense_id)
                              .single()
                            
                            if (expense) {
                              paid_by = expense.paid_by
                              split_between = expense.split_between
                            }
                          }
                          
                          setNewItineraryItem({
                            day: item.day,
                            time: item.time,
                            time_end: item.time_end || '',
                            start_date: item.start_date || '',
                            end_date: item.end_date || '',
                            title: item.title,
                            details: item.details,
                            type: item.type,
                            address: item.address || '',
                            phone: item.phone || '',
                            website: item.website || '',
                            rating: item.rating || 0,
                            latitude: item.latitude || 0,
                            longitude: item.longitude || 0,
                            cost: item.cost || 0,
                            expense_id: item.expense_id || null,
                            paid_by,
                            split_between
                          })
                          setActiveTab('itinerary')
                          setSelectedDay(item.day)
                          setShowItineraryModal(true)
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        ✏️ Bearbeiten
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* View all on map */}
          {itemsWithAddress.length > 1 && (
            <div className="mt-6 pt-6 border-t">
              <a
                href={`https://www.google.com/maps/dir/${itemsWithAddress
                  .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
                  .map(item => encodeURIComponent(item.address))
                  .join('/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
              >
                🗺️ Alle Orte als Route in Google Maps öffnen
              </a>
              <p className="text-xs text-gray-500 text-center mt-2">
                Öffnet alle {itemsWithAddress.length} Orte in der richtigen Reihenfolge
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

 // Im renderTabContent oder wo auch immer der Team-Tab ist
case 'friends': {
  const currentMember = tripMembers.find(m => 
    m.trip_id === currentTrip?.id && m.user_id === currentUser?.id
  )
  
  const isOwnerOrAdmin = currentMember && (currentMember.role === 'owner' || currentMember.role === 'admin')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team-Mitglieder</h2>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">
            Mitglieder ({tripMembers.filter(m => m.trip_id === currentTrip?.id).length})
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {tripMembers
            .filter(m => m.trip_id === currentTrip?.id)
            .map(member => {
              const user = users.find(u => u.id === member.user_id)
              return (
                <div key={member.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl">
                    {member.role === 'owner' ? '👑' : member.role === 'admin' ? '⭐' : '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{user?.name || 'Unbekannt'}</div>
                    <div className="text-sm text-gray-600">{user?.email}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.role === 'owner' ? 'Owner' : 
                     member.role === 'admin' ? 'Admin' : 'Member'}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {isOwnerOrAdmin && currentUser?.role === 'admin' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Mitglieder verwalten?</strong> Gehe zum{' '}
            <button
              onClick={() => setActiveTab('admin')}
              className="underline font-medium hover:text-blue-900"
            >
              Admin-Panel
            </button>
            {' '}→ Reise-Mitglieder Tab
          </p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium mb-2">Rollen-Erklärung:</h4>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• <strong>👑 Owner:</strong> Volle Kontrolle über die Reise</li>
          <li>• <strong>⭐ Admin:</strong> Kann Mitglieder einladen und verwalten</li>
          <li>• <strong>👤 Member:</strong> Kann teilnehmen und Ausgaben erfassen</li>
        </ul>
      </div>
    </div>
  )
}
   

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
                trip_id: currentTrip?.id || '', // Pre-select current trip
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
          <p className="text-gray-600">Nur fÃ¼r Administratoren zugÃ¤nglich</p>
        </div>
      )
    }

    // Calculate statistics
    const totalExpensesAllTrips = allUserTrips.reduce((sum, trip) => {
      const tripExpenses = expenses.filter(e => e.trip_id === trip.id)
      return sum + tripExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    }, 0)

    const activeUsersCount = users.filter(u => u.is_active).length
    const adminCount = users.filter(u => u.role === 'admin').length
    const activeTripsCount = allUserTrips.filter(t => t.status === 'active').length
    const archivedTripsCount = allUserTrips.filter(t => t.status === 'archived').length

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Admin Panel</h2>
            <p className="text-sm text-gray-600 mt-1">
              System-Ãœbersicht und Benutzerverwaltung
            </p>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
          >
            <span>+</span> Benutzer erstellen
          </button>
        </div>

        {/* Enhanced Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl">ðŸ'¥</div>
              <span className="text-xs text-gray-500">Gesamt</span>
            </div>
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-gray-600 mt-1">Benutzer</div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
              <span className="text-green-600">ðŸŸ¢ {activeUsersCount} aktiv</span>
              <span className="text-purple-600">â­ {adminCount} admins</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl">ðŸŒ</div>
              <span className="text-xs text-gray-500">Gesamt</span>
            </div>
            <div className="text-2xl font-bold">{allUserTrips.length}</div>
            <div className="text-sm text-gray-600 mt-1">Reisen</div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
              <span className="text-green-600">âœ… {activeTripsCount} aktiv</span>
              <span className="text-gray-600">ðŸ"¦ {archivedTripsCount} archiviert</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl">ðŸ'°</div>
              <span className="text-xs text-gray-500">Gesamt</span>
            </div>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <div className="text-sm text-gray-600 mt-1">Ausgaben</div>
            <div className="mt-3 pt-3 border-t text-xs">
              <span className="text-teal-600 font-medium">
                {totalExpensesAllTrips.toFixed(2)} CHF
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl">ðŸŽ'</div>
              <span className="text-xs text-gray-500">System</span>
            </div>
            <div className="text-2xl font-bold">v2.0</div>
            <div className="text-sm text-gray-600 mt-1">Version</div>
            <div className="mt-3 pt-3 border-t text-xs">
              <span className="text-green-600">âœ… Alle Systeme online</span>
            </div>
          </div>
        </div>

        {/* User Management Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Benutzerverwaltung</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {users.length} Benutzer â€¢ {activeUsersCount} aktiv â€¢ {users.length - activeUsersCount} inaktiv
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  ðŸ"„ Aktualisieren
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left border-b">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benutzer
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontakt
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rolle
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => {
                  const userTripsCount = allUserTrips.filter(t => t.created_by === user.id).length
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-bold">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {user.name}
                              {user.id === currentUser.id && (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                                  Du
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {userTripsCount} {userTripsCount === 1 ? 'Reise' : 'Reisen'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'â­ Admin' : 'ðŸ'¤ Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'ðŸŸ¢ Aktiv' : 'ðŸ"´ Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              // View user details
                              alert(`Details fÃ¼r ${user.name}:\n\nID: ${user.id}\nEmail: ${user.email}\nRolle: ${user.role}\nStatus: ${user.is_active ? 'Aktiv' : 'Inaktiv'}\nReisen: ${userTripsCount}`)
                            }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                            title="Details anzeigen"
                          >
                            ðŸ'ï¸
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={user.id === currentUser.id}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            title={user.id === currentUser.id ? 'Eigenes Konto kann nicht gelÃ¶scht werden' : 'Benutzer lÃ¶schen'}
                          >
                            ðŸ—'ï¸
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">ðŸ"Š System-Informationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Datenbank</div>
              <div className="font-semibold">Supabase PostgreSQL</div>
              <div className="text-xs text-green-600 mt-2">âœ… Verbunden</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Authentifizierung</div>
              <div className="font-semibold">Supabase Auth</div>
              <div className="text-xs text-green-600 mt-2">âœ… Aktiv</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Storage</div>
              <div className="font-semibold">Supabase Storage</div>
              <div className="text-xs text-green-600 mt-2">âœ… VerfÃ¼gbar</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">API Status</div>
              <div className="font-semibold">All Systems Operational</div>
              <div className="text-xs text-green-600 mt-2">âœ… 100% Uptime</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-3">ðŸš€ Schnellaktionen</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              + Neuer Benutzer
            </button>
            <button
              onClick={() => loadUsers()}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm"
            >
              ðŸ"„ Benutzerliste aktualisieren
            </button>
            <button
              onClick={() => {
                const report = `
=== SYSTEM REPORT ===
Generiert: ${new Date().toLocaleString('de-DE')}

BENUTZER:
- Gesamt: ${users.length}
- Aktiv: ${activeUsersCount}
- Inaktiv: ${users.length - activeUsersCount}
- Admins: ${adminCount}

REISEN:
- Gesamt: ${allUserTrips.length}
- Aktiv: ${activeTripsCount}
- Archiviert: ${archivedTripsCount}

AUSGABEN:
- Gesamt: ${expenses.length}
- Gesamtbetrag: ${totalExpensesAllTrips.toFixed(2)} CHF
                `
                console.log(report)
                alert('Report wurde in der Konsole ausgegeben (F12 Ã¶ffnen)')
              }}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm"
            >
              ðŸ"Š Report generieren
            </button>
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
    case 'settlement':
      return renderSettlementTab()
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
                <option value="active">🟢 Aktiv</option>
                <option value="archived">📦 Archiviert</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {editingTrip.status === 'archived' 
                  ? '📦 Archivierte Reisen bleiben sichtbar, werden aber ausgeblendet'
                  : '🟢 Aktive Reisen werden standardmäßig angezeigt'}
              </p>
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
              <label className="block text-sm font-medium mb-2">Reise *</label>
              <select
                value={newExpense.trip_id}
                onChange={(e) => setNewExpense({...newExpense, trip_id: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Reise auswählen --</option>
                {allUserTrips.filter(t => t.status === 'active').map(trip => (
                  <option key={trip.id} value={trip.id}>
                    {trip.flag} {trip.name} ({trip.destination})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Wähle die Reise, zu der diese Ausgabe gehört
              </p>
            </div>

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
              <label className="block text-sm font-medium mb-2">
                Betrag * ({newExpense.trip_id ? allUserTrips.find(t => t.id === newExpense.trip_id)?.currency || 'EUR' : 'EUR'})
              </label>
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
              {newExpense.trip_id ? (
                <div className="space-y-2">
                  {/* Dropdown für Reise-Mitglieder */}
                  <select 
                    value={newExpense.paid_by}
                    onChange={(e) => setNewExpense({...newExpense, paid_by: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Person auswählen --</option>
                    {tripMembers
                      .filter(m => m.trip_id === newExpense.trip_id)
                      .map(member => {
                        const user = users.find(u => u.id === member.user_id)
                        return (
                          <option key={member.user_id} value={user?.name || member.user_id}>
                            {user?.name || 'Unbekannt'}
                          </option>
                        )
                      })}
                  </select>
                  
                  {/* Freitext-Eingabe für andere Personen */}
                  <input 
                    type="text"
                    placeholder="Oder anderen Namen eingeben..."
                    value={!tripMembers.some(m => m.trip_id === newExpense.trip_id && users.find(u => u.id === m.user_id)?.name === newExpense.paid_by) ? newExpense.paid_by : ''}
                    onChange={(e) => setNewExpense({...newExpense, paid_by: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    💡 Wähle aus der Liste oder gib einen anderen Namen ein
                  </p>
                </div>
              ) : (
                <input 
                  type="text"
                  placeholder="Erst Reise auswählen..."
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Geteilt zwischen *</label>
              {newExpense.trip_id ? (
                <div className="space-y-3">
                  {/* Checkboxen für Reise-Mitglieder */}
                  <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Reise-Mitglieder:</p>
                    {tripMembers
                      .filter(m => m.trip_id === newExpense.trip_id)
                      .map(member => {
                        const user = users.find(u => u.id === member.user_id)
                        const userName = user?.name || 'Unbekannt'
                        return (
                          <label key={member.user_id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={newExpense.split_between.includes(userName)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewExpense({
                                    ...newExpense,
                                    split_between: [...newExpense.split_between, userName]
                                  })
                                } else {
                                  setNewExpense({
                                    ...newExpense,
                                    split_between: newExpense.split_between.filter(name => name !== userName)
                                  })
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span>{userName}</span>
                          </label>
                        )
                      })}
                    
                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          const allNames = tripMembers
                            .filter(m => m.trip_id === newExpense.trip_id)
                            .map(m => users.find(u => u.id === m.user_id)?.name || 'Unbekannt')
                          setNewExpense({
                            ...newExpense,
                            split_between: Array.from(new Set([...newExpense.split_between, ...allNames]))
                          })
                        }}
                        className="text-xs px-3 py-1 bg-teal-100 hover:bg-teal-200 rounded"
                      >
                        Alle auswählen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const memberNames = tripMembers
                            .filter(m => m.trip_id === newExpense.trip_id)
                            .map(m => users.find(u => u.id === m.user_id)?.name || 'Unbekannt')
                          setNewExpense({
                            ...newExpense,
                            split_between: newExpense.split_between.filter(name => !memberNames.includes(name))
                          })
                        }}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Keine auswählen
                      </button>
                    </div>
                  </div>
                  
                  {/* Zusätzliche Personen (Freitext) */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Weitere Personen hinzufügen:</p>
                    <input 
                      type="text"
                      placeholder="z.B. externe Person 1, externe Person 2"
                      value={externalNamesInput}
                      onChange={(e) => {
                        setExternalNamesInput(e.target.value)
                      }}
                      onBlur={() => {
                        // Bei Verlassen des Feldes: Namen zum Array hinzufügen
                        if (externalNamesInput.trim()) {
                          const memberNames = tripMembers
                            .filter(m => m.trip_id === newExpense.trip_id)
                            .map(m => users.find(u => u.id === m.user_id)?.name || 'Unbekannt')
                          const selectedMembers = newExpense.split_between.filter(name => memberNames.includes(name))
                          
                          const externalNames = externalNamesInput
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s.length > 0)
                          
                          setNewExpense({
                            ...newExpense,
                            split_between: Array.from(new Set([...selectedMembers, ...externalNames]))
                          })
                        }
                      }}
                      onKeyDown={(e) => {
                        // Bei Enter: Namen hinzufügen
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (externalNamesInput.trim()) {
                            const memberNames = tripMembers
                              .filter(m => m.trip_id === newExpense.trip_id)
                              .map(m => users.find(u => u.id === m.user_id)?.name || 'Unbekannt')
                            const selectedMembers = newExpense.split_between.filter(name => memberNames.includes(name))
                            
                            const externalNames = externalNamesInput
                              .split(',')
                              .map(s => s.trim())
                              .filter(s => s.length > 0)
                            
                            setNewExpense({
                              ...newExpense,
                              split_between: Array.from(new Set([...selectedMembers, ...externalNames]))
                            })
                            setExternalNamesInput('') // Clear input after adding
                          }
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Komma-getrennt eingeben, dann Enter drücken oder Feld verlassen
                    </p>
                  </div>
                  
                  {/* Ausgewählte Personen anzeigen */}
                  {newExpense.split_between.length > 0 && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-sm font-medium text-teal-900 mb-1">
                        Ausgewählt ({newExpense.split_between.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {newExpense.split_between.map((name, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => setNewExpense({
                                ...newExpense,
                                split_between: newExpense.split_between.filter(n => n !== name)
                              })}
                              className="hover:text-teal-900 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      {newExpense.amount && newExpense.split_between.length > 0 && (
                        <p className="text-sm font-medium text-teal-700 mt-2">
                          Pro Person: {(parseFloat(newExpense.amount) / newExpense.split_between.length).toFixed(2)} {allUserTrips.find(t => t.id === newExpense.trip_id)?.currency || 'EUR'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input 
                  type="text"
                  placeholder="Erst Reise auswählen..."
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500"
                />
              )}
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
                setExternalNamesInput('') // Reset external names input
                setNewExpense({
                  trip_id: currentTrip?.id || '', // Add missing trip_id
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
                <label className="block text-sm font-medium mb-2">Von (Uhrzeit) *</label>
                <input 
                  type="time"
                  value={newItineraryItem.time}
                  onChange={(e) => setNewItineraryItem({...newItineraryItem, time: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bis (Uhrzeit)</label>
                <input 
                  type="time"
                  value={newItineraryItem.time_end}
                  onChange={(e) => setNewItineraryItem({...newItineraryItem, time_end: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Endzeit</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bis (Datum)</label>
                <input 
                  type="date"
                  value={newItineraryItem.end_date}
                  onChange={(e) => setNewItineraryItem({...newItineraryItem, end_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Für mehrtägige Aktivitäten</p>
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
  <label className="block text-sm font-medium mb-2">Titel / Ort *</label>
  <PlacesAutocomplete
    value={newItineraryItem.title || ''}
    onChange={(value) => setNewItineraryItem({...newItineraryItem, title: value})}
    onPlaceSelect={(place) => {
      setNewItineraryItem({
        ...newItineraryItem,
        title: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        cost: newItineraryItem.cost || 0,
        expense_id: newItineraryItem.expense_id || null
      })
    }}
    placeholder="🔍 Tippe um zu suchen... (z.B. Hotel Schweizerhof)"
  />
  <p className="text-xs text-gray-500 mt-1">
    💡 Tippe mindestens 3 Buchstaben für Vorschläge (OpenStreetMap)
  </p>
</div>

{/* Optional: Adresse manuell eingeben */}
<div>
  <label className="block text-sm font-medium mb-2">Adresse (optional)</label>
  <input
    type="text"
    value={newItineraryItem.address || ''}
    onChange={(e) => setNewItineraryItem({...newItineraryItem, address: e.target.value})}
    placeholder="z.B. Bahnhofplatz 11, Bern"
    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
  />
</div>

{/* Optional: Telefon */}
<div>
  <label className="block text-sm font-medium mb-2">Telefon (optional)</label>
  <input
    type="tel"
    value={newItineraryItem.phone || ''}
    onChange={(e) => setNewItineraryItem({...newItineraryItem, phone: e.target.value})}
    placeholder="z.B. +41 31 123 45 67"
    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
  />
</div>

{/* Optional: Website */}
<div>
  <label className="block text-sm font-medium mb-2">Website (optional)</label>
  <input
    type="url"
    value={newItineraryItem.website || ''}
    onChange={(e) => setNewItineraryItem({...newItineraryItem, website: e.target.value})}
    placeholder="z.B. https://hotel-schweizerhof.ch"
    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
  />
</div>
{/* Optional: Kosten */}
<div>
  <label className="block text-sm font-medium mb-2">Kosten (optional)</label>
  <div className="flex gap-2">
    <input
      type="number"
      step="0.01"
      value={newItineraryItem.cost || ''}
      onChange={(e) => setNewItineraryItem({...newItineraryItem, cost: parseFloat(e.target.value) || 0})}
      placeholder="0.00"
      className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
    />
    <select
      className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
      defaultValue="CHF"
    >
      <option>CHF</option>
      <option>EUR</option>
      <option>USD</option>
    </select>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    💡 Wird automatisch in Ausgaben-Tab übernommen
  </p>
</div>

{/* Kostenteilung - nur anzeigen wenn Kosten > 0 */}
{newItineraryItem.cost > 0 && (
  <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
    <h4 className="font-semibold text-purple-900 flex items-center gap-2">
      💰 Kostenteilung
    </h4>
    
    {/* Bezahlt von */}
    <div>
      <label className="block text-sm font-medium mb-2">Bezahlt von *</label>
      <select 
        value={newItineraryItem.paid_by}
        onChange={(e) => setNewItineraryItem({...newItineraryItem, paid_by: e.target.value})}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
      >
        <option value="">-- Wähle Person --</option>
        {tripMembers.map(member => (
          <option key={member.user_id} value={member.user_id}>
            {users.find(u => u.id === member.user_id)?.name || 'Unbekannt'}
          </option>
        ))}
      </select>
    </div>

    {/* Split zwischen */}
    <div>
      <label className="block text-sm font-medium mb-2">Aufteilen zwischen *</label>
      <div className="space-y-2">
        {tripMembers.map(member => {
          const user = users.find(u => u.id === member.user_id)
          return (
            <label key={member.user_id} className="flex items-center gap-2 p-2 hover:bg-purple-100 rounded cursor-pointer">
              <input 
                type="checkbox"
                checked={newItineraryItem.split_between.includes(member.user_id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setNewItineraryItem({
                      ...newItineraryItem,
                      split_between: [...newItineraryItem.split_between, member.user_id]
                    })
                  } else {
                    setNewItineraryItem({
                      ...newItineraryItem,
                      split_between: newItineraryItem.split_between.filter(id => id !== member.user_id)
                    })
                  }
                }}
                className="w-4 h-4"
              />
              <span>{user?.name || 'Unbekannt'}</span>
            </label>
          )
        })}
        
        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-purple-200">
          <button
            type="button"
            onClick={() => setNewItineraryItem({
              ...newItineraryItem,
              split_between: tripMembers.map(m => m.user_id)
            })}
            className="text-xs px-3 py-1 bg-purple-100 hover:bg-purple-200 rounded"
          >
            Alle auswählen
          </button>
          <button
            type="button"
            onClick={() => setNewItineraryItem({
              ...newItineraryItem,
              split_between: []
            })}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Keine auswählen
          </button>
        </div>
      </div>
      
      {/* Kosten-Vorschau */}
      {newItineraryItem.split_between.length > 0 && (
        <div className="mt-2 p-2 bg-purple-100 rounded text-sm">
          <span className="font-medium">Pro Person: </span>
          <span className="text-purple-700 font-bold">
            {(newItineraryItem.cost / newItineraryItem.split_between.length).toFixed(2)} {currentTrip?.currency || 'CHF'}
          </span>
        </div>
      )}
    </div>
  </div>
)}

{/* Details-Vorschau */}
{newItineraryItem.address && (
  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
    <h4 className="font-semibold text-sm text-blue-900 mb-2">
      ✨ Automatisch gefunden:
    </h4>
    
    <div className="space-y-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-gray-600">📍</span>
        <span>{newItineraryItem.address}</span>
      </div>
      
      {newItineraryItem.phone && (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">📞</span>
          <a href={`tel:${newItineraryItem.phone}`} className="text-teal-600 hover:underline">
            {newItineraryItem.phone}
          </a>
        </div>
      )}
      
      {newItineraryItem.website && (
        <div className="flex items-center gap-2">
          <span className="text-gray-600">🌐</span>
          <a href={newItineraryItem.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
            Website ↗
          </a>
        </div>
      )}
      
      {newItineraryItem.rating > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-yellow-500">{'⭐'.repeat(Math.round(newItineraryItem.rating))}</span>
          <span>{newItineraryItem.rating}</span>
        </div>
      )}
    </div>
  </div>
)}

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
                  time_end: '',
                  start_date: '',
                  end_date: '',
                  title: '',
                  details: '',
                  type: '',
                  address: '',
                  phone: '',
                  website: '',
                  rating: 0,
                  latitude: 0,
                  longitude: 0,
                  cost: 0,
                  expense_id: null,
                  paid_by: '',
                  split_between: []
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

 const renderAddMemberToTripModal = () => {
  if (!showAddMemberToTripModal) return null

  const availableUsers = users.filter(user => 
    !tripMembers.some(m => m.trip_id === selectedTripForAdmin && m.user_id === user.id)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Mitglied zur Reise hinzufügen</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Benutzer *</label>
            <select
              value={memberToAdd}
              onChange={(e) => setMemberToAdd(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- Benutzer auswählen --</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            {availableUsers.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Alle Benutzer sind bereits Mitglied dieser Reise
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rolle *</label>
            <select
              value={memberRoleToAdd}
              onChange={(e) => setMemberRoleToAdd(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="member">👤 Member</option>
              <option value="admin">⭐ Admin</option>
              <option value="owner">👑 Owner</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => {
              setShowAddMemberToTripModal(false)
              setMemberToAdd('')
              setMemberRoleToAdd('member')
            }}
            className="flex-1 px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button 
            onClick={addMemberToTrip}
            disabled={loadingAction || !memberToAdd}
            className="flex-1 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {loadingAction ? 'Füge hinzu...' : 'Hinzufügen'}
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
      {renderTemplateSelectorModal()}
      {renderSaveAsTemplateModal()}
    </div>
  )
}
