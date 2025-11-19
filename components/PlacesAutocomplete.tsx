'use client'

import { useEffect, useRef } from 'react'

// Declare google types
declare global {
  interface Window {
    google: typeof google
  }
  const google: any
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
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => {
    const initAutocomplete = async () => {
      if (!containerRef.current || !window.google) {
        setTimeout(initAutocomplete, 100)
        return
      }

      // Check if already initialized
      if (autocompleteRef.current) {
        return
      }

      try {
        // Use new PlaceAutocompleteElement API (2025+)
        if (window.google.maps.places.PlaceAutocompleteElement) {
          console.log('✅ Using new PlaceAutocompleteElement API')
          
          const autocomplete = new google.maps.places.PlaceAutocompleteElement({
            componentRestrictions: { country: [] },
            fields: ['displayName', 'formattedAddress', 'internationalPhoneNumber', 'websiteURI', 'rating', 'location'],
            types: ['establishment', 'tourist_attraction', 'lodging', 'restaurant']
          })

          autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place

            if (!place) return

            // Fetch full place details
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'internationalPhoneNumber', 'websiteURI', 'rating', 'location']
            })

            const details: PlaceDetails = {
              name: place.displayName || place.Fg?.displayName || '',
              address: place.formattedAddress || place.Fg?.formattedAddress || '',
              phone: place.internationalPhoneNumber || place.Fg?.internationalPhoneNumber,
              website: place.websiteURI || place.Fg?.websiteURI,
              rating: place.rating || place.Fg?.rating,
              latitude: place.location?.lat() || place.Fg?.location?.lat(),
              longitude: place.location?.lng() || place.Fg?.location?.lng()
            }

            console.log('📍 Selected (new API):', details)
            onPlaceSelect(details)
          })

          // Replace container with autocomplete element
          if (containerRef.current) {
            containerRef.current.innerHTML = ''
            containerRef.current.appendChild(autocomplete)
          }

          autocompleteRef.current = autocomplete

        } else {
          // Fallback: Use old Autocomplete API
          console.log('⚠️ Using legacy Autocomplete API')
          
          const input = document.createElement('input')
          input.type = 'text'
          input.value = value
          input.placeholder = placeholder
          input.className = 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500'
          
          input.addEventListener('input', (e) => {
            onChange((e.target as HTMLInputElement).value)
          })

          const autocomplete = new google.maps.places.Autocomplete(input, {
            types: ['establishment', 'tourist_attraction', 'lodging', 'restaurant'],
            fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'geometry']
          })

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()

            if (!place.name) return

            const details: PlaceDetails = {
              name: place.name,
              address: place.formatted_address || '',
              phone: place.formatted_phone_number,
              website: place.website,
              rating: place.rating,
              latitude: place.geometry?.location?.lat(),
              longitude: place.geometry?.location?.lng()
            }

            console.log('📍 Selected (legacy):', details)
            onPlaceSelect(details)
          })

          if (containerRef.current) {
            containerRef.current.innerHTML = ''
            containerRef.current.appendChild(input)
          }

          autocompleteRef.current = autocomplete
        }
      } catch (error) {
        console.error('❌ Error initializing autocomplete:', error)
      }
    }

    initAutocomplete()

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        autocompleteRef.current = null
      }
    }
  }, [])  // ✅ EMPTY ARRAY - nur einmal beim Mount ausführen

  return (
    <div 
      ref={containerRef}
      className="w-full"
    />
  )
}
