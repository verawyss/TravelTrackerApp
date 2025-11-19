'use client'

import { useEffect, useRef } from 'react'

interface PlaceDetails {
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
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
    const initAutocomplete = () => {
      if (!inputRef.current || !window.google) {
        setTimeout(initAutocomplete, 100)
        return
      }

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'tourist_attraction', 'lodging', 'restaurant'],
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating']
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()

        if (!place.name) return

        const details: PlaceDetails = {
          name: place.name,
          address: place.formatted_address || '',
          phone: place.formatted_phone_number,
          website: place.website,
          rating: place.rating
        }

        console.log('📍 Selected:', details)
        onPlaceSelect(details)
      })
    }

    initAutocomplete()
  }, [onPlaceSelect])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500"
    />
  )
}
