'use client'

import { useEffect, useRef } from 'react'

// Declare google types
declare global {
  interface Window {
    google: any
  }
  var google: any
}

interface PlaceDetails {
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
  latitude?: number
  longitude?: number
}

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceDetails) => void
  placeholder?: string
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = '🔍 Hotel, Restaurant suchen...'
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let autocomplete: any = null

    const initAutocomplete = () => {
      // Check if Google Maps is loaded
      if (!window.google?.maps?.places) {
        console.log('⏳ Waiting for Google Maps...')
        setTimeout(initAutocomplete, 100)
        return
      }

      if (!inputRef.current) {
        setTimeout(initAutocomplete, 100)
        return
      }

      console.log('✅ Initializing Autocomplete')

      try {
        // Use the OLD working API (ignore the warning for now)
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'tourist_attraction', 'lodging', 'restaurant'],
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'geometry']
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()

          console.log('📍 Place changed:', place)

          if (!place || !place.name) {
            console.log('❌ No place selected')
            return
          }

          const details: PlaceDetails = {
            name: place.name || '',
            address: place.formatted_address || '',
            phone: place.formatted_phone_number || '',
            website: place.website || '',
            rating: place.rating || 0,
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0
          }

          console.log('✅ Selected place:', details)
          onPlaceSelect(details)
        })

        console.log('✅ Autocomplete initialized successfully')
      } catch (error) {
        console.error('❌ Error initializing autocomplete:', error)
      }
    }

    // Start initialization
    initAutocomplete()

    // Cleanup
    return () => {
      if (autocomplete) {
        window.google?.maps?.event?.clearInstanceListeners(autocomplete)
      }
    }
  }, [onPlaceSelect])

  // Update input value when prop changes
  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.value = value
    }
  }, [value])

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
    />
  )
}
