import { describe, expect, it } from 'vitest'
import { validateLocal } from './useStaticTrip'
import snapshot from './snapshot.json'
import { getMergedItems } from '../utils/dayMerge'

describe('published static trip boundaries', () => {
  it('accepts current and previous note exports and only known keys', () => {
    const legacy = validateLocal({ localNotes: { d4: '取行李', general: '手机备份', unrelated: 'skip' }, localChecklist: { 'train-choice': true } })
    expect(legacy.notes).toEqual({ d4: '取行李', general: '手机备份' })
    expect(legacy.tasks['train-choice']).toBe(true)
    expect(validateLocal(legacy)).toEqual(legacy)
  })
  it('rejects malformed and oversized backups before updating local state', () => {
    expect(() => validateLocal({ notes: [] })).toThrow()
    expect(() => validateLocal({ notes: { d4: 'x'.repeat(6001) } })).toThrow()
    expect(() => validateLocal({ tasks: { 'train-choice': 'true' } })).toThrow()
    expect(validateLocal({ notes: JSON.parse('{"__proto__":"ignored"}') }).notes).toEqual({})
  })
  it('puts the fixed train between the morning visit and afternoon Arashiyama stops', () => {
    const items = getMergedItems({ dayAssignments: snapshot.assignments['4'], dayNotes: [], dayTransports: snapshot.reservations.filter(r => r.type === 'train'), dayId: 4 })
    expect(items.map(row => row.type === 'transport' ? row.data.title : row.data.place.name)).toEqual([
      '金门京都酒店 · Hotel Gimmond Kyoto', '东福寺', '嵯峨野8号｜龟冈 → 嵯峨', '常寂光寺', '岚山竹林', '渡月桥', '金门京都酒店 · Hotel Gimmond Kyoto', '临空城站',
    ])
  })
})
