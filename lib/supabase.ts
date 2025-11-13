// =====================================================
// TRAVELTRACKER PRO - ERWEITERTE TYPES & HELPERS
// Version 2.0 - Multi-User, Auth, Karte
// =====================================================

import { createClient } from '@supabase/supabase-js'

// ✅ SICHERE ENV VAR PRÜFUNG
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('❌ FEHLER: NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt! Bitte in Vercel Environment Variables hinzufügen.')
}

if (!supabaseAnonKey) {
  throw new Error('❌ FEHLER: NEXT_PUBLIC_SUPABASE_ANON_KEY ist nicht gesetzt! Bitte in Vercel Environment Variables hinzufügen.')
}

console.log('✅ Supabase Client wird initialisiert...')
console.log('   URL:', supabaseUrl)
console.log('   Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

// ✅ Standard Client für normale Operationen (mit RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// ✅ Service Role Client für Admin-Operationen (OHNE RLS) - NUR für Server-Side!
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

if (!supabaseAdmin) {
  console.warn('⚠️ WARNUNG: SUPABASE_SERVICE_ROLE_KEY nicht gesetzt - Admin-Funktionen nicht verfügbar')
}

console.log('✅ Supabase Clients erfolgreich initialisiert')

// =====================================================
// ERWEITERTE TYPESCRIPT TYPES
// =====================================================

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  avatar?: string
  auth_id?: string
  last_login?: string
  is_active: boolean
  created_at?: string
}

export interface Trip {
  id: string
  name: string
  destination: string
  flag: string
  start_date: string
  end_date: string
  status: 'active' | 'archived'
  cover_image?: string
  budget?: number
  currency: string
  is_public: boolean
  created_by?: string
  created_at?: string
}

export interface TripMember {
  id: string
  trip_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user?: User
}

export interface TripWithMembers extends Trip {
  member_count: number
  member_names: string[]
  member_emails: string[]
  members?: TripMember[]
}

export interface Invitation {
  id: string
  trip_id: string
  invited_by: string
  invited_email: string
  invited_user_id?: string
  status: 'pending' | 'accepted' | 'declined'
  token: string
  expires_at: string
  created_at: string
  trip?: Trip
  inviter?: User
}

export interface Location {
  id: string
  trip_id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  type: 'accommodation' | 'restaurant' | 'activity' | 'transport' | 'other'
  expense_id?: string
  itinerary_id?: string
  notes?: string
  created_at?: string
}

export interface Expense {
  id: string
  trip_id: string
  category: string
  description: string
  amount: number
  paid_by: string
  split_between: string[]
  location_id?: string
  created_at?: string
}

export interface ItineraryItem {
  id: string
  trip_id: string
  day: number
  time: string
  title: string
  details: string
  type: string
  location_id?: string
  created_at?: string
}

export interface PackingItem {
  id: string
  trip_id: string
  category: string
  item: string
  packed: boolean
  essential: boolean
  created_at?: string
}

// =====================================================
// AUTH HELPER FUNCTIONS
// =====================================================

export async function signUp(email: string, password: string, name: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError

  // Create user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      email,
      name,
      role: 'member',
      auth_id: authData.user?.id,
      is_active: true
    })
    .select()
    .single()

  if (userError) throw userError

  return { auth: authData, user: userData }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // Update last login
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('auth_id', data.user.id)

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  return userData
}

// =====================================================
// TRIP MANAGEMENT
// =====================================================

export async function createTrip(trip: Omit<Trip, 'id' | 'created_at'>, userId: string) {
  // Create trip
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single()

  if (tripError) throw tripError

  // Add creator as owner
  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripData.id,
      user_id: userId,
      role: 'owner'
    })

  if (memberError) throw memberError

  return tripData
}

export async function getUserTrips(userId: string) {
  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      *,
      trip:trips(*)
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTripMembers(tripId: string) {
  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      *,
      user:users(*)
    `)
    .eq('trip_id', tripId)

  if (error) throw error
  return data
}

export async function updateTrip(tripId: string, updates: Partial<Trip>) {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTrip(tripId: string) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)

  if (error) throw error
}

// =====================================================
// INVITATION MANAGEMENT
// =====================================================

export async function inviteUserToTrip(
  tripId: string,
  email: string,
  invitedBy: string
) {
  // Generate token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  // Create invitation
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      trip_id: tripId,
      invited_by: invitedBy,
      invited_email: email,
      invited_user_id: existingUser?.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error

  // TODO: Send email with invitation link
  // const inviteLink = `${window.location.origin}/invite/${token}`
  
  return data
}

export async function acceptInvitation(token: string, userId: string) {
  // Get invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (invError) throw invError

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation expired')
  }

  // Add user to trip
  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: invitation.trip_id,
      user_id: userId,
      role: 'member'
    })

  if (memberError) throw memberError

  // Update invitation status
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  if (updateError) throw updateError

  return invitation.trip_id
}

export async function getPendingInvitations(email: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      trip:trips(*),
      inviter:users!invited_by(*)
    `)
    .eq('invited_email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())

  if (error) throw error
  return data
}

// =====================================================
// LOCATION MANAGEMENT (für Karte)
// =====================================================

export async function createLocation(location: Omit<Location, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('locations')
    .insert(location)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTripLocations(tripId: string) {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('trip_id', tripId)

  if (error) throw error
  return data
}

export async function updateLocation(locationId: string, updates: Partial<Location>) {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', locationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLocation(locationId: string) {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId)

  if (error) throw error
}

// Geocoding Helper (convert address to coordinates)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Using OpenStreetMap Nominatim (free, no API key needed)
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
// MEMBER MANAGEMENT
// =====================================================

export async function addTripMember(tripId: string, userId: string, role: 'admin' | 'member' = 'member') {
  const { data, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripId,
      user_id: userId,
      role
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeTripMember(tripId: string, userId: string) {
  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateMemberRole(tripId: string, userId: string, role: 'owner' | 'admin' | 'member') {
  const { data, error } = await supabase
    .from('trip_members')
    .update({ role })
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function formatCurrency(amount: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency
  }).format(amount)
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c // Distance in km
  return d
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}
// =====================================================
// ERWEITERTE PACKING LIST TYPES & FUNCTIONS
// Zu lib/supabase.ts hinzufügen
// =====================================================

// ========== NEUE TYPES ==========

export interface PackingListTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  icon: string
  trip_type?: string
  is_public: boolean
  use_count: number
  created_at: string
  updated_at: string
}

export interface PackingListTemplateItem {
  id: string
  template_id: string
  category: string
  item: string
  essential: boolean
  quantity: number
  notes?: string
  sort_order: number
  created_at: string
}

export interface TripPackingList {
  id: string
  trip_id: string
  template_id?: string
  name: string
  created_from_template: boolean
  created_at: string
  template?: PackingListTemplate
}

export interface TripPackingItem {
  id: string
  trip_packing_list_id: string
  category: string
  item: string
  packed: boolean
  essential: boolean
  quantity: number
  notes?: string
  packed_by?: string
  packed_at?: string
  sort_order: number
  created_at: string
}

export interface PackingListWithItems extends TripPackingList {
  items: TripPackingItem[]
  total_items: number
  packed_items: number
  progress_percentage: number
}

export interface TemplateWithItems extends PackingListTemplate {
  items: PackingListTemplateItem[]
  total_items: number
}

// ========== TEMPLATE MANAGEMENT ==========

/**
 * Alle Templates des Users abrufen (inkl. öffentliche Templates)
 */
export async function getPackingTemplates(userId: string) {
  const { data, error } = await supabase
    .from('packing_list_templates')
    .select('*')
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order('use_count', { ascending: false })
    .order('name')

  if (error) throw error
  return data as PackingListTemplate[]
}

/**
 * Template mit allen Items abrufen
 */
export async function getTemplateWithItems(templateId: string): Promise<TemplateWithItems> {
  // Get template
  const { data: template, error: templateError } = await supabase
    .from('packing_list_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError) throw templateError

  // Get items
  const { data: items, error: itemsError } = await supabase
    .from('packing_list_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')

  if (itemsError) throw itemsError

  return {
    ...template,
    items: items || [],
    total_items: items?.length || 0
  }
}

/**
 * Neues Template erstellen
 */
export async function createPackingTemplate(
  userId: string,
  template: Omit<PackingListTemplate, 'id' | 'user_id' | 'use_count' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('packing_list_templates')
    .insert({
      ...template,
      user_id: userId
    })
    .select()
    .single()

  if (error) throw error
  return data as PackingListTemplate
}

/**
 * Template bearbeiten
 */
export async function updatePackingTemplate(
  templateId: string,
  updates: Partial<PackingListTemplate>
) {
  const { data, error } = await supabase
    .from('packing_list_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single()

  if (error) throw error
  return data as PackingListTemplate
}

/**
 * Template löschen
 */
export async function deletePackingTemplate(templateId: string) {
  const { error } = await supabase
    .from('packing_list_templates')
    .delete()
    .eq('id', templateId)

  if (error) throw error
}

/**
 * Item zu Template hinzufügen
 */
export async function addTemplateItem(
  templateId: string,
  item: Omit<PackingListTemplateItem, 'id' | 'template_id' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('packing_list_template_items')
    .insert({
      ...item,
      template_id: templateId
    })
    .select()
    .single()

  if (error) throw error
  return data as PackingListTemplateItem
}

/**
 * Template-Item bearbeiten
 */
export async function updateTemplateItem(
  itemId: string,
  updates: Partial<PackingListTemplateItem>
) {
  const { data, error } = await supabase
    .from('packing_list_template_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data as PackingListTemplateItem
}

/**
 * Template-Item löschen
 */
export async function deleteTemplateItem(itemId: string) {
  const { error } = await supabase
    .from('packing_list_template_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

// ========== TRIP PACKING LIST MANAGEMENT ==========

/**
 * Packliste für Trip erstellen (leer oder aus Template)
 */
export async function createTripPackingList(
  tripId: string,
  name: string,
  templateId?: string
) {
  if (templateId) {
    // Verwende SQL-Funktion um Template zu kopieren
    const { data, error } = await supabase.rpc('copy_template_to_trip', {
      p_template_id: templateId,
      p_trip_id: tripId,
      p_list_name: name
    })

    if (error) throw error
    return data
  } else {
    // Erstelle leere Packliste
    const { data, error } = await supabase
      .from('trip_packing_lists')
      .insert({
        trip_id: tripId,
        name,
        created_from_template: false
      })
      .select()
      .single()

    if (error) throw error
    return data as TripPackingList
  }
}

/**
 * Packliste für Trip abrufen (mit Items und Statistiken)
 */
export async function getTripPackingList(tripId: string): Promise<PackingListWithItems | null> {
  // Get packing list
  const { data: packingList, error: listError } = await supabase
    .from('trip_packing_lists')
    .select(`
      *,
      template:packing_list_templates(*)
    `)
    .eq('trip_id', tripId)
    .single()

  if (listError) {
    if (listError.code === 'PGRST116') return null // Not found
    throw listError
  }

  // Get items
  const { data: items, error: itemsError } = await supabase
    .from('trip_packing_items')
    .select('*')
    .eq('trip_packing_list_id', packingList.id)
    .order('sort_order')

  if (itemsError) throw itemsError

  const totalItems = items?.length || 0
  const packedItems = items?.filter(item => item.packed).length || 0

  return {
    ...packingList,
    items: items || [],
    total_items: totalItems,
    packed_items: packedItems,
    progress_percentage: totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0
  }
}

/**
 * Item zur Trip-Packliste hinzufügen
 */
export async function addTripPackingItem(
  packingListId: string,
  item: Omit<TripPackingItem, 'id' | 'trip_packing_list_id' | 'packed' | 'packed_by' | 'packed_at' | 'created_at'>
) {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .insert({
      ...item,
      trip_packing_list_id: packingListId,
      packed: false
    })
    .select()
    .single()

  if (error) throw error
  return data as TripPackingItem
}

/**
 * Item als gepackt/ungepackt markieren
 */
export async function togglePackingItem(itemId: string, packed: boolean, userId?: string) {
  const updates: any = {
    packed,
    packed_at: packed ? new Date().toISOString() : null
  }

  if (packed && userId) {
    updates.packed_by = userId
  } else if (!packed) {
    updates.packed_by = null
  }

  const { data, error } = await supabase
    .from('trip_packing_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data as TripPackingItem
}

/**
 * Trip-Packing-Item bearbeiten
 */
export async function updateTripPackingItem(
  itemId: string,
  updates: Partial<TripPackingItem>
) {
  const { data, error } = await supabase
    .from('trip_packing_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data as TripPackingItem
}

/**
 * Trip-Packing-Item löschen
 */
export async function deleteTripPackingItem(itemId: string) {
  const { error } = await supabase
    .from('trip_packing_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

/**
 * Trip-Packliste löschen
 */
export async function deleteTripPackingList(tripId: string) {
  const { error } = await supabase
    .from('trip_packing_lists')
    .delete()
    .eq('trip_id', tripId)

  if (error) throw error
}

/**
 * Template aus aktueller Packliste erstellen
 */
export async function saveAsTemplate(
  tripId: string,
  userId: string,
  templateName: string,
  templateDescription: string,
  icon: string = '🎒',
  isPublic: boolean = false
) {
  // Get current packing list with items
  const packingList = await getTripPackingList(tripId)
  if (!packingList) throw new Error('No packing list found for this trip')

  // Create new template
  const template = await createPackingTemplate(userId, {
    name: templateName,
    description: templateDescription,
    icon,
    is_public: isPublic
  })

  // Copy items to template
  for (const item of packingList.items) {
    await addTemplateItem(template.id, {
      category: item.category,
      item: item.item,
      essential: item.essential,
      quantity: item.quantity,
      notes: item.notes,
      sort_order: item.sort_order
    })
  }

  return template
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Kategorien aus Packliste extrahieren
 */
export function getPackingCategories(items: (TripPackingItem | PackingListTemplateItem)[]): string[] {
  const categories = new Set(items.map(item => item.category))
  return Array.from(categories).sort()
}

/**
 * Items nach Kategorie gruppieren
 */
export function groupItemsByCategory(items: (TripPackingItem | PackingListTemplateItem)[]) {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof items>)
}

/**
 * Statistiken für Packliste berechnen
 */
export function calculatePackingStats(items: TripPackingItem[]) {
  const total = items.length
  const packed = items.filter(i => i.packed).length
  const essential = items.filter(i => i.essential).length
  const essentialPacked = items.filter(i => i.essential && i.packed).length
  
  return {
    total,
    packed,
    unpacked: total - packed,
    essential,
    essentialPacked,
    essentialUnpacked: essential - essentialPacked,
    progress: total > 0 ? Math.round((packed / total) * 100) : 0,
    essentialProgress: essential > 0 ? Math.round((essentialPacked / essential) * 100) : 0
  }
}

// ========== EXPORT ==========

export const PackingListService = {
  // Templates
  getPackingTemplates,
  getTemplateWithItems,
  createPackingTemplate,
  updatePackingTemplate,
  deletePackingTemplate,
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  
  // Trip Packing Lists
  createTripPackingList,
  getTripPackingList,
  addTripPackingItem,
  togglePackingItem,
  updateTripPackingItem,
  deleteTripPackingItem,
  deleteTripPackingList,
  saveAsTemplate,
  
  // Utils
  getPackingCategories,
  groupItemsByCategory,
  calculatePackingStats
}

// =====================================================
// EXPORT ALL
// =====================================================

export default {
  supabase,
  supabaseAdmin,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  createTrip,
  getUserTrips,
  getTripMembers,
  updateTrip,
  deleteTrip,
  inviteUserToTrip,
  acceptInvitation,
  getPendingInvitations,
  createLocation,
  getTripLocations,
  updateLocation,
  deleteLocation,
  geocodeAddress,
  addTripMember,
  removeTripMember,
  updateMemberRole,
  formatCurrency,
  calculateDistance
}
