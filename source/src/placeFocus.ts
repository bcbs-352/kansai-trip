export interface PlaceTarget {
  id: number
  name: string
  lat?: number | null
  lng?: number | null
}

export interface FocusedPlace {
  id: number
  name: string
  lat: number
  lng: number
  request: number
}

export function nextPlaceFocus(previous: FocusedPlace | null, place: PlaceTarget): FocusedPlace | null {
  if (typeof place.lat !== 'number' || typeof place.lng !== 'number' ||
      !Number.isFinite(place.lat) || !Number.isFinite(place.lng) ||
      Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) return null
  return { id: place.id, name: place.name, lat: place.lat, lng: place.lng, request: (previous?.request ?? 0) + 1 }
}
