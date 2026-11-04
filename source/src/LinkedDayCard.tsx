// Adapted from TREK 5.1.0 (dc36c21c), AGPL-3.0. Static-only map linkage.
import { ChevronDown, ChevronRight, Hotel } from 'lucide-react'
import { fs, NEUTRAL_TINT } from '../components/shared/DialogShell'
import { getCategoryIcon } from '../components/shared/categoryIcons'
import { Tooltip } from '../components/shared/Tooltip'
import { SoftPill, TimePill, tintOf } from '../components/Planner/planParts'
import { TypeTile } from '../components/Planner/bookings/bookingParts'
import { typeInfo } from '../components/Planner/bookings/bookingsModel'
import { getNoteIcon } from '../components/Planner/DayPlanSidebar.constants'
import { noteSurface } from '../components/Planner/noteSurface'
import { useTranslation } from '../i18n'
import { useSettingsStore } from '../store/settingsStore'
import { getDisplayTimeForDay, getSpanPhase, type MergedItem } from '../utils/dayMerge'
import { formatTime, splitReservationDateTime } from '../utils/formatters'
import { safeHexColor } from '../utils/safeColor'
import { SharedPlaceDetails, type SharedPlaceLike } from '../pages/sharedTrip/SharedPlaceDetails'
import { spanLabelKey, transportFacts, type SharedTransport } from '../pages/sharedTrip/sharedTripModel'
import type { PlaceTarget } from './placeFocus'
import rail from './saganoRail.json'

const DAY_HEAD_SELECTED = 'color-mix(in srgb, var(--accent) 12%, transparent)'

export interface LinkedDayCardProps {
  day: { id: number; title?: string | null; date?: string | null; day_number: number }
  index: number
  selected: boolean
  collapsed: boolean
  onSelect: () => void
  onToggleCollapse: () => void
  /** The day's rows, merged and ordered the way the planner orders them. */
  items: MergedItem[]
  stays: { id: number; place_name?: string | null; start_day_id?: number | null; end_day_id?: number | null }[]
  placeCount: number
  stopNumber: Record<number, number>
  categories: { id: number; color?: string | null; icon?: string | null }[]
  selectedPlaceId?: number | null
  selectedStopId?: number | null
  onLocatePlace: (place: PlaceTarget) => void
  onShowRailway?: (stationIndex?: number) => void
  /** A "travel and stays" link (#1712) counts no places and says nothing about an empty plan. */
  travelOnly?: boolean
}

/**
 * One day as the planner draws it: a head band with the day's number on a
 * raised tile, its name, date and stays, and the plan below it. Clicking the
 * head opens the day on the map; the chevron folds the plan away.
 */
export function LinkedDayCard(p: LinkedDayCardProps) {
  const { t, locale } = useTranslation()
  const { day } = p
  // A stays-only day on a travel link is its head alone: its hotel pill says it all.
  const hasBody = !(p.travelOnly && p.items.length === 0)
  const date = day.date
    ? new Date(`${day.date}T00:00:00Z`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    : null

  return (
    <article
      id={`shared-day-${day.id}`}
      className={`scroll-mt-20 overflow-hidden rounded-2xl border border-edge-faint bg-surface-card transition-shadow ${p.selected ? 'shadow-md' : ''}`}
    >
      <div className="flex items-start gap-1 py-2.5 ps-2.5 pe-2" style={{ background: p.selected ? DAY_HEAD_SELECTED : NEUTRAL_TINT }}>
        <button type="button" onClick={p.onSelect} aria-pressed={p.selected} className="flex min-w-0 flex-1 items-start gap-2.5 text-start">
          <span
            className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] font-geist font-bold tabular-nums shadow-sm ${p.selected ? 'bg-accent text-accent-text' : 'bg-surface-card text-content-muted'}`}
            style={fs(12)}
          >
            {p.index + 1}
          </span>
          <span className="min-w-0 flex-1 pt-px">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="min-w-0 truncate font-bold text-content" style={fs(13.5, 'body')}>
                {day.title || t('dayplan.dayN', { n: day.day_number })}
              </span>
              {date && <span className="flex-none whitespace-nowrap text-content-faint" style={fs(11)}>{date}</span>}
            </span>
            <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
              {p.stays.map(stay => <StayPill key={stay.id} stay={stay} dayId={day.id} />)}
              {!p.travelOnly && <SoftPill>{p.placeCount} {t('shared.places', { count: p.placeCount })}</SoftPill>}
            </span>
          </span>
        </button>
        {hasBody && <button
          type="button"
          onClick={p.onToggleCollapse}
          aria-label={p.collapsed ? t('common.expand') : t('common.collapse')}
          aria-expanded={!p.collapsed}
          className="grid h-7 w-7 flex-none place-items-center rounded-full text-content-muted hover:bg-surface-card hover:text-content"
        >
          {p.collapsed ? <ChevronRight size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
        </button>}
      </div>

      {hasBody && !p.collapsed && (
        <div className="flex flex-col gap-0.5 border-t border-edge-faint p-1.5">
          {p.items.length === 0 ? (
            <p className="px-2 py-2.5 text-content-faint" style={fs(12, 'body')}>{t('dayplan.emptyDay')}</p>
          ) : (
            p.items.map(item => {
              if (item.type === 'transport') return <div key={item.data.__leg ? `t-${item.data.id}-leg${item.data.__leg.index}` : `t-${item.data.id}`}><TransportRow r={item.data} dayId={day.id} />{p.onShowRailway && item.data.title.includes('嵯峨野8号') && <RailwayDetails onShow={p.onShowRailway} />}</div>
              if (item.type === 'note') return <NoteRow key={`n-${item.data.id}`} note={item.data} />
              if (!item.data.place) return null
              return (
                <PlaceRow
                  key={`p-${item.data.id}`}
                  place={item.data.place}
                  notes={item.data.notes}
                  number={p.stopNumber[item.data.id]}
                  category={p.categories.find(c => c.id === item.data.place.category_id) ?? item.data.place.category ?? null}
                  selected={p.selectedPlaceId === item.data.place.id && (p.selectedStopId == null || p.selectedStopId === item.data.id)}
                  onLocate={place => p.onLocatePlace({ ...place, stopId: item.data.id })}
                />
              )
            })
          )}
        </div>
      )}
    </article>
  )
}

function RailwayDetails({ onShow }: { onShow: (stationIndex?: number) => void }) {
  const directions = (from: string, to: string) => `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', origin: from, destination: to, travelmode: 'walking' })}`
  return <div className="mx-1 mb-1 rounded-xl border border-edge-faint bg-surface-tertiary px-3 py-3 text-caption text-content-secondary">
    <p className="font-semibold text-content">小火车站序</p>
    <div className="mt-1 flex flex-wrap items-center gap-1">{rail.stations.map((station, index) => <button key={station.japanese} type="button" onClick={() => onShow(index)} className="rounded-md border border-edge bg-surface-card px-2 py-1 text-content hover:bg-surface-hover" aria-label={`在地图定位${station.name}`}>{index + 1} {station.name.replace('小火车', '')}</button>)}</div>
    <p className="mt-1">12:30 龟冈上车 · 12:56 嵯峨下车；保津峡、岚山为途中经过站。</p>
    <button type="button" onClick={() => onShow()} className="mt-2 rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-text">在地图查看小火车轨道和车站</button>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      <a target="_blank" rel="noopener noreferrer" className="text-accent-on underline" href={directions(rail.transfer.japanese, rail.stations[0].japanese)}>JR马堀 → 小火车龟冈 · 步行导航 ↗</a>
      <a target="_blank" rel="noopener noreferrer" className="text-accent-on underline" href={directions(rail.stations[3].japanese, '常寂光寺 京都')}>小火车嵯峨 → 常寂光寺 · 步行导航 ↗</a>
    </div>
    <p className="mt-2 text-content-faint">轨道与站位：<a className="underline" href={rail.sourceUrl} target="_blank" rel="noopener noreferrer">日本国土交通省铁路数据（2024）↗</a></p>
  </div>
}

/** A stay on this day, its check-in green and its check-out red, as the planner marks them. */
function StayPill({ stay, dayId }: { stay: LinkedDayCardProps['stays'][number]; dayId: number }) {
  const { t } = useTranslation()
  const isCheckIn = stay.start_day_id === dayId
  const isCheckOut = stay.end_day_id === dayId
  const state = isCheckOut && !isCheckIn ? t('day.checkOut') : isCheckIn ? t('day.checkIn') : null
  const tone = isCheckOut && !isCheckIn ? 'text-danger' : isCheckIn ? 'text-success' : 'text-content-faint'
  const name = stay.place_name || ''
  return (
    <Tooltip label={state ? `${state}: ${name}` : name}>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-surface-card px-2 py-[2px] font-geist text-content-secondary shadow-sm" style={fs(10.5)}>
        <Hotel size={11} strokeWidth={2} className={`flex-none ${tone}`} />
        <span className="truncate">{name}</span>
      </span>
    </Tooltip>
  )
}

export interface PlaceRowProps {
  place: SharedPlaceLike & { id: number; image_url?: string | null }
  notes?: string | null
  number?: number
  category: { color?: string | null; icon?: string | null } | null
  selected?: boolean
  onLocate: (place: PlaceTarget) => void
}

export function PlaceRow({ place, notes, number, category, selected = false, onLocate }: PlaceRowProps) {
  const { locale } = useTranslation()
  const timeFormat = useSettingsStore(s => s.settings.time_format)
  const color = safeHexColor(category?.color, '#6366f1')
  const CatIcon = getCategoryIcon(category?.icon)
  const time = place.place_time
    ? `${formatTime(place.place_time, locale, timeFormat)}${place.end_time ? ` → ${formatTime(place.end_time, locale, timeFormat)}` : ''}`
    : null
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-2 py-2 ${selected ? 'bg-accent-subtle ring-1 ring-inset ring-accent' : ''}`}>
      <button type="button" className="relative flex-none rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" aria-label={`定位 ${place.name}（地点图标）`} aria-pressed={selected} onClick={() => onLocate(place)} title="在地图中定位">
        <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full shadow-sm" style={{ background: color }}>
          {place.image_url
            ? <img src={place.image_url} alt="" className="h-full w-full object-cover" />
            : <CatIcon size={16} strokeWidth={2} color="white" />}
        </span>
        {number != null && (
          <span className="absolute -bottom-1 -end-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border border-edge-faint bg-surface-card px-1 font-geist font-bold tabular-nums text-content shadow-sm" style={fs(9.5)}>
            {number}
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex min-w-0 items-start gap-2">
          <button type="button" className="min-w-0 flex-1 text-start font-semibold text-content hover:text-accent-on focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" style={{ ...fs(13.5, 'body'), lineHeight: 1.3 }} aria-label={`在地图中定位 ${place.name}`} aria-pressed={selected} onClick={() => onLocate(place)} title="在地图中定位">{place.name}</button>
          {time && <TimePill className="mt-px">{time}</TimePill>}
        </div>
        <SharedPlaceDetails place={place} assignmentNotes={notes} />
      </div>
    </div>
  )
}

function TransportRow({ r, dayId }: { r: SharedTransport; dayId: number }) {
  const { t, locale } = useTranslation()
  const timeFormat = useSettingsStore(s => s.settings.time_format)
  const color = typeInfo(r.type).color
  // A leg carries its own times; the booking's span decides which of its two a day shows.
  const phase = r.__leg ? 'single' : getSpanPhase(r, dayId)
  const start = splitReservationDateTime(r.__leg ? r.reservation_time : getDisplayTimeForDay(r, dayId)).time
  const end = phase === 'single' ? splitReservationDateTime(r.reservation_end_time).time : null
  const time = [start ? formatTime(start, locale, timeFormat) : '', end ? formatTime(end, locale, timeFormat) : ''].filter(Boolean).join(' → ')
  const spanKey = spanLabelKey(r.type, phase)
  const facts = transportFacts(r, t('reservations.meta.platform'))
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5" style={{ border: `1px solid ${tintOf(color, 24)}`, background: tintOf(color, 7) }}>
      <TypeTile type={r.type} size={34} raised />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-content" style={{ ...fs(13, 'body'), lineHeight: 1.3 }}>{r.title}</div>
        {(time || spanKey || facts.length > 0) && (
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
            {spanKey && <SoftPill caps>{t(spanKey)}</SoftPill>}
            {time && <TimePill>{time}</TimePill>}
            {facts.map(f => <span key={f} className="whitespace-nowrap font-medium text-content-muted" style={fs(11)}>{f}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteRow({ note }: { note: { id: number; text: string; time?: string | null; icon?: string | null; color?: string | null } }) {
  const skin = noteSurface(note.color)
  const Icon = getNoteIcon(note.icon)
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-2 py-2" style={{ background: skin.background, border: `1px solid ${skin.border}` }}>
      <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px]" style={{ background: skin.iconBackground, color: skin.iconColor }}>
        <Icon size={14} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="whitespace-pre-wrap text-content-secondary [overflow-wrap:anywhere]" style={fs(12.5, 'body')}>{note.text}</div>
        {note.time && <div className="mt-1"><TimePill>{note.time}</TimePill></div>}
      </div>
    </div>
  )
}
