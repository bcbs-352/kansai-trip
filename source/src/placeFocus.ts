export interface PlaceTarget {
  id: number
  name: string
  lat?: number | null
  lng?: number | null
  /** Identifies an occurrence when the itinerary returns to the same place. */
  stopId?: number
}

export interface FocusedPlace {
  id: number
  name: string
  lat: number
  lng: number
  request: number
  stopId?: number
}

export function nextPlaceFocus(previous: FocusedPlace | null, place: PlaceTarget): FocusedPlace | null {
  if (typeof place.lat !== 'number' || typeof place.lng !== 'number' ||
      !Number.isFinite(place.lat) || !Number.isFinite(place.lng) ||
      Math.abs(place.lat) > 90 || Math.abs(place.lng) > 180) return null
  return { id: place.id, name: place.name, lat: place.lat, lng: place.lng, request: (previous?.request ?? 0) + 1,
    ...(place.stopId == null ? {} : { stopId: place.stopId }) }
}

type LocatedPlace = PlaceTarget & { lat: number; lng: number }

/** Frame the clicked occurrence and its distinct previous/next stops, never unrelated days. */
export function focusRouteContext(place: FocusedPlace, route: readonly PlaceTarget[]): LocatedPlace[] {
  const at = route.findIndex(p => place.stopId == null ? p.id === place.id : p.stopId === place.stopId && p.id === place.id)
  const context: LocatedPlace[] = [place]
  if (at < 0) return context
  for (const direction of [-1, 1]) {
    for (let i = at + direction; i >= 0 && i < route.length; i += direction) {
      const point = route[i]
      if (point.id === place.id || !nextPlaceFocus(null, point)) continue
      if (!context.some(p => p.id === point.id)) context.push(point as LocatedPlace)
      break
    }
  }
  return context
}
