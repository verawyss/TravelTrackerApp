import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript Types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  avatar?: string
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
  created_at?: string
  created_by?: string
}

export interface Expense {
  id: string
  trip_id: string
  category: string
  description: string
  amount: number
  paid_by: string
  split_between: string[]
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
