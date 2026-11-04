import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'
import type { Day, Reservation } from '../types'
import type { SharedPlanView } from '../pages/sharedTrip/SharedPlanView'
import snapshot from './snapshot.json'
import plan from './trip.json'

export const trip = plan
export const data = snapshot as unknown as ComponentProps<typeof SharedPlanView>['data'] & {
  trip: { title: string; description: string; start_date: string; end_date: string }
  days: Day[]
  reservations: Reservation[]
}
type LocalState = { notes: Record<string, string>; tasks: Record<string, boolean>; costs: Record<string, boolean> }
const KEY = 'kansai-planner-local-v1'
const blank = (): LocalState => ({ notes: {}, tasks: {}, costs: {} })
const noteIds = new Set(['general', ...plan.days.map(d => d.id)])
const taskIds = new Set(plan.todos.map(t => t.id))
const costIds = new Set(plan.costs.map(c => c.id))

export function validateLocal(input: unknown): LocalState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('备份格式不正确')
  const obj = input as Record<string, unknown>
  const result = blank()
  for (const [field, allowed] of [['notes', noteIds], ['tasks', taskIds], ['costs', costIds]] as const) {
    const raw = obj[field] ?? obj[{ notes: 'localNotes', tasks: 'localChecklist', costs: 'localBudget' }[field]] ?? {}
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('备份字段格式不正确')
    for (const [key, value] of Object.entries(raw)) {
      if (!allowed.has(key)) continue
      if (field === 'notes') {
        if (typeof value !== 'string' || value.length > (key === 'general' ? 12000 : 6000)) throw new Error('备忘过长或格式不正确')
        result.notes[key] = value
      } else {
        if (typeof value !== 'boolean') throw new Error('勾选项格式不正确')
        result[field][key] = value
      }
    }
  }
  return result
}

export function useStaticTrip() {
  const [tab, setTab] = useState('plan')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set())
  const [message, setMessage] = useState('')
  const [local, setLocal] = useState<LocalState>(() => {
    try { return validateLocal(JSON.parse(localStorage.getItem(KEY) || '{}')) }
    catch { return blank() }
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(local)) }
    catch { setMessage('浏览器未能保存备忘，请使用“导出备份”保存。') }
  }, [local])
  const toggleDay = (id: number) => setCollapsed(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const note = (id: string, text: string) => setLocal(previous => ({ ...previous, notes: { ...previous.notes, [id]: text } }))
  const check = (field: 'tasks' | 'costs', id: string, value: boolean) => setLocal(previous => ({ ...previous, [field]: { ...previous[field], [id]: value } }))
  const download = (filename: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const link = document.createElement('a')
    link.href = url; link.download = filename; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const exportBackup = () => download('kansai-notes.json', JSON.stringify({ version: 1, ...local }, null, 2), 'application/json')
  const importBackup = async (file: File) => {
    try {
      if (file.size > 2000000) throw new Error('备份文件过大')
      const incoming = validateLocal(JSON.parse(await file.text()))
      const notes = { ...local.notes }
      for (const [key, text] of Object.entries(incoming.notes)) {
        if (!text || notes[key]?.includes(text)) continue
        const merged = notes[key] ? `${notes[key]}\n\n—— 导入备忘 ——\n${text}` : text
        if (merged.length > (key === 'general' ? 12000 : 6000)) throw new Error('合并后备忘过长，请先分别保存')
        notes[key] = merged
      }
      setLocal({ notes, tasks: { ...local.tasks, ...incoming.tasks }, costs: { ...local.costs, ...incoming.costs } })
      setMessage('已合并本机备忘和勾选。')
    } catch (error) { setMessage(`导入失败：${error instanceof Error ? error.message : '无法读取文件'}`) }
  }
  const exportTrip = () => {
    const lines = [`# ${trip.title}`, trip.dates, trip.note, '']
    for (const day of trip.days) {
      lines.push(`## ${day.short} ${day.title}`, day.summary, day.reminder, `住宿：${day.stay}`, '')
      day.events.forEach(e => lines.push(`- ${e.time} ${e.title}［${e.status === 'confirmed' ? '已明确' : '候选／建议'}］：${e.detail}`))
      for (const route of day.routes) {
        lines.push(`### ${route.title}`, route.description)
        route.legs.forEach(([a, b, label, mode]) => lines.push(`- [${label}](${navigation(a, b, mode)})`))
      }
      if (local.notes[day.id]) lines.push('### 本机备忘', local.notes[day.id])
      lines.push('')
    }
    lines.push('## 航班（各端当地时间）')
    trip.flights.forEach(f => lines.push(`- ${f.number}：${f.from} ${f.departure} → ${f.to} ${f.arrival}；${f.note}`))
    lines.push('## 交通与住宿记录')
    data.reservations.forEach(r => lines.push(`- ${r.title}：${r.reservation_time || ''}；${r.location || ''}；${r.notes || ''}`))
    lines.push('## 费用参考（非付款记录）')
    trip.costs.forEach(c => lines.push(`- ${c.name}：¥${c.amount}/${c.unit}，核验 ${c.checked}。${c.note}`))
    lines.push('## 临时状况处理')
    trip.contingencies.forEach(c => lines.push(`### ${c.title}`, c.trigger, ...c.steps.map(s => `- ${s}`)))
    lines.push('## 总备忘', local.notes.general || '')
    download('关西旅行计划.md', lines.join('\n\n'), 'text/markdown;charset=utf-8')
  }
  return { tab, setTab, selectedDay, setSelectedDay, collapsed, toggleDay, local, note, check, message, exportBackup, importBackup, exportTrip }
}

export function navigation(from: string, to: string, mode: string) {
  const places: Record<string, { query: string }> = trip.places
  const url = new URL('https://www.google.com/maps/dir/')
  url.search = new URLSearchParams({ api: '1', origin: places[from].query, destination: places[to].query, travelmode: mode }).toString()
  return url.href
}
