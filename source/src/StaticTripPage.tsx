import { Map, Route, Ticket, Wallet, NotebookPen } from 'lucide-react'
import { SharedHero, SharedTabBar, PAGE_WIDTH } from '../pages/sharedTrip/SharedChrome'
import { LinkedPlanView } from './LinkedPlanView'
import { SharedBookingsView } from '../pages/sharedTrip/SharedBookingsView'
import { data, trip, useStaticTrip } from './useStaticTrip'
import { PracticalPanels } from './PracticalPanels'

const tabs = [
  { id: 'plan', label: '日程', icon: Map },
  { id: 'bookings', label: '预订', icon: Ticket },
  { id: 'routes', label: '路线', icon: Route },
  { id: 'costs', label: '费用', icon: Wallet },
  { id: 'notes', label: '备忘', icon: NotebookPen },
]

export default function StaticTripPage() {
  const state = useStaticTrip()
  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary text-body">
      <header className="border-b border-edge-faint bg-surface-elevated">
        <div className={`${PAGE_WIDTH} flex min-h-14 flex-wrap items-center gap-3 py-3`}>
          <img src={`${import.meta.env.BASE_URL}logo-dark.svg`} alt="TREK" style={{ height: 26 }} />
          <span className="text-content-muted">关西旅行</span>
          <span className="ms-auto rounded-full bg-surface-tertiary px-3 py-1 text-caption text-content-muted">静态行程 · {trip.updated}</span>
        </div>
      </header>
      <main className={`${PAGE_WIDTH} screen-trip flex-1 pt-5`}>
        <SharedHero trip={data.trip} stats={[{ key: 'days', value: 5, label: '天' }, { key: 'places', value: Object.keys(trip.places).length, label: '地点与候选' }, { key: 'bookings', value: data.reservations.length, label: '交通与住宿记录' }]} />
        <div className="mt-4 rounded-2xl border border-edge-faint bg-surface-card p-4 text-caption leading-relaxed text-content-secondary">
          <strong className="text-content">11/30 宇治至少到中午 · 12/1 岚山小火车 12:30–12:56 · 12/2 关西机场 09:20 起飞</strong>
          <p className="mt-1">点击地点图标或名称可在地图中定位。地图虚线表示游览顺序，实际道路与接驳请打开 Google Maps。个人备忘与勾选仅保存在当前浏览器。</p>
        </div>
        <div className="static-tabs"><SharedTabBar tabs={tabs} active={state.tab} onChange={state.setTab} /></div>
        <div className="pb-6">
          {state.tab === 'plan' && <LinkedPlanView data={data} selectedDay={state.selectedDay} onSelectDay={state.setSelectedDay} onPickDayOnMap={state.setSelectedDay} collapsedDays={state.collapsed} onToggleDay={state.toggleDay} focusedPlace={state.focusedPlace} onLocatePlace={state.focusPlace} onClearFocus={state.clearPlaceFocus} />}
          {state.tab === 'bookings' && <SharedBookingsView reservations={data.reservations} days={data.days} tripCurrency="JPY" />}
          {['routes', 'costs', 'notes'].includes(state.tab) && <PracticalPanels state={state} />}
        </div>
      </main>
      <div className="print-trip">
        <h1>{trip.title}</h1><p>{trip.dates}</p><p>{trip.note}</p>
        <h2>交通与住宿</h2>{data.reservations.map(r => <p key={r.id}>{r.title} · {r.reservation_time} · {r.location}<br />{r.notes}</p>)}
        {trip.days.map(d => <section key={d.id}><h2>{d.short} · {d.title}</h2><p>{d.summary}</p><p>{d.reminder}</p><p>住宿：{d.stay}</p>{d.events.map((e, i) => <p key={i}><strong>{e.time} · {e.title}［{e.status === 'confirmed' ? '已明确' : '候选／建议'}］</strong><br />{e.detail}</p>)}{state.local.notes[d.id] && <p>本机备忘：{state.local.notes[d.id]}</p>}</section>)}
        <h2>费用参考（非付款记录）</h2>{trip.costs.map(c => <p key={c.id}>{c.name} · ¥{c.amount}/{c.unit} · 核验 {c.checked}<br />{c.note}</p>)}
        <h2>临时状况</h2>{trip.contingencies.map(c => <section key={c.id}><h3>{c.title}</h3><p>{c.trigger}</p><ol>{c.steps.map(s => <li key={s}>{s}</li>)}</ol></section>)}
        <h2>总备忘</h2><p>{state.local.notes.general || ''}</p>
      </div>
      <footer className="mt-6 border-t border-edge-faint bg-surface-card">
        <div className={`${PAGE_WIDTH} flex flex-wrap items-center justify-between gap-3 py-6 text-caption text-content-muted`}>
          <span>TREK 5.1.0 · GitHub Pages 静态行程</span>
          <a href="https://github.com/bcbs-352/kansai-trip" target="_blank" rel="noopener noreferrer" className="underline">项目与维护说明 ↗</a>
          <a href="./source/README.md" className="underline">源代码与 AGPL 许可 ↗</a>
        </div>
      </footer>
    </div>
  )
}
