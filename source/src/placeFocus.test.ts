import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { nextPlaceFocus } from './placeFocus'
import { useStaticTrip } from './useStaticTrip'

const hotel = { id: 3, name: 'LOCO Minamiichi', lat: 34.6796, lng: 135.8302 }

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
})
