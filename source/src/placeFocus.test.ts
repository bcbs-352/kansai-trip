import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { focusRouteContext, nextPlaceFocus } from './placeFocus'
import { computeMapViewport } from '../utils/mapViewport'
import { useStaticTrip } from './useStaticTrip'

const hotel = { id: 3, name: 'LOCO Minamiichi', lat: 34.6796, lng: 135.8302 }
const station = { id: 2, name: 'JR Nara', lat: 34.6805, lng: 135.8189 }
const pond = { id: 4, name: 'Sarusawa', lat: 34.6807, lng: 135.8318 }

describe('place to map linkage', () => {
  it('allows the same place to recenter the map again after a pan', () => {
    const first = nextPlaceFocus(null, hotel)
    expect(nextPlaceFocus(first, hotel)).toEqual({ ...hotel, request: 2 })
    expect(nextPlaceFocus(null, { ...hotel, lat: 0, lng: 0 })).not.toBeNull()
  })

  it('rejects missing, non-finite and out-of-range map coordinates', () => {
    for (const point of [{ ...hotel, lat: null }, { ...hotel, lng: NaN }, { ...hotel, lat: 91 }, { ...hotel, lng: 181 }]) {
      expect(nextPlaceFocus(null, point)).toBeNull()
    }
  })

  it('selects the clicked day, clears stale focus on day switches, and supports unplanned places', () => {
    const { result } = renderHook(() => useStaticTrip())
    act(() => result.current.focusPlace(1, hotel))
    expect(result.current.selectedDay).toBe(1)
    expect(result.current.focusedPlace?.id).toBe(3)
    act(() => result.current.setSelectedDay(4))
    expect(result.current.focusedPlace).toBeNull()
    act(() => result.current.focusPlace(null, hotel))
    expect(result.current.selectedDay).toBeNull()
    expect(result.current.focusedPlace?.name).toBe('LOCO Minamiichi')
  })

  it('returns to the same day overview without changing notes or checkmarks', () => {
    const { result } = renderHook(() => useStaticTrip())
    const local = result.current.local
    act(() => result.current.focusPlace(1, hotel))
    act(() => result.current.clearPlaceFocus())
    expect(result.current.selectedDay).toBe(1)
    expect(result.current.focusedPlace).toBeNull()
    expect(result.current.local).toBe(local)
  })

  it('frames just the adjacent route stops, including endpoints', () => {
    const route = [station, hotel, pond]
    expect(focusRouteContext(nextPlaceFocus(null, hotel)!, route).map(p => p.id)).toEqual([3, 2, 4])
    expect(focusRouteContext(nextPlaceFocus(null, station)!, route).map(p => p.id)).toEqual([2, 3])
    expect(focusRouteContext(nextPlaceFocus(null, pond)!, route).map(p => p.id)).toEqual([4, 3])
  })

  it('distinguishes the return visit from the first visit to the same hotel', () => {
    const route = [{ ...hotel, stopId: 1 }, station, pond, { ...hotel, stopId: 4 }, { id: 24, name: 'Rinku', lat: 34.4109, lng: 135.2994 }]
    expect(focusRouteContext(nextPlaceFocus(null, route[0])!, route).map(p => p.id)).toEqual([3, 2])
    expect(focusRouteContext(nextPlaceFocus(null, route[3])!, route).map(p => p.id)).toEqual([3, 4, 24])
  })

  it('skips unusable and repeated adjacent locations without pulling in unrelated places', () => {
    const route = [station, { ...pond, lat: NaN }, hotel, hotel, pond]
    expect(focusRouteContext(nextPlaceFocus(null, hotel)!, route).map(p => p.id)).toEqual([3, 2, 4])
    expect(focusRouteContext(nextPlaceFocus(null, hotel)!, [station, pond])).toHaveLength(1)
  })

  it('leaves a neighborhood view for a standalone stop and widens for a cross-city leg', () => {
    const options = { width: 350, height: 340, maxZoom: 15, singlePlaceZoom: 14, padding: { top: 88, right: 72, bottom: 92, left: 72 } }
    expect(computeMapViewport([hotel], options)?.zoom).toBe(14)
    const airport = { id: 1, name: 'KIX', lat: 34.4358, lng: 135.2438 }
    const view = computeMapViewport(focusRouteContext(nextPlaceFocus(null, station)!, [airport, station, hotel]), options)!
    expect(view.zoom).toBeLessThan(11)
    expect(view.center[0]).toBeGreaterThan(airport.lat)
    expect(view.center[0]).toBeLessThan(hotel.lat)
  })
})
