'use client'

import { useState, useEffect, useRef } from 'react'

interface PlaceDetails {
  name: string
  address: string
  latitude: number
  longitude: number
}

interface NominatimAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceDetails) => void
  placeholder?: string
}

export default function NominatimAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = '🔍 Hotel, Restaurant suchen...'
}: NominatimAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      // Nominatim API (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '5',
          'accept-language': 'de',
        }),
        {
          headers: {
            'User-Agent': 'TravelTrackerPro/1.0'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('📍 Nominatim Ergebnisse:', data)
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      }
    } catch (error) {
      console.error('❌ Nominatim Fehler:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (newValue: string) => {
    onChange(newValue)

    // Debounce search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      searchPlaces(newValue)
    }, 500)
  }

  const handleSelectPlace = (place: any) => {
    const details: PlaceDetails = {
      name: place.display_name.split(',')[0],
      address: place.display_name,
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon)
    }

    console.log('✅ Ort ausgewählt:', details)
    onChange(details.name)
    onPlaceSelect(details)
    setShowSuggestions(false)
    setSuggestions([])
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
      />

      {loading && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin h-5 w-5 border-2 border-teal-600 border-t-transparent rounded-full" />
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((place, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectPlace(place)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">📍</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {place.display_name.split(',')[0]}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {place.display_name.split(',').slice(1).join(',')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          Keine Ergebnisse gefunden
        </div>
      )}
    </div>
  )
}
