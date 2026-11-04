import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { trip, navigation, type useStaticTrip } from './useStaticTrip'

type Props = { state: ReturnType<typeof useStaticTrip> }
const button = 'rounded-full border border-edge bg-surface-card px-4 py-2 text-caption font-semibold text-content hover:bg-surface-hover'
function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-edge-faint bg-surface-card p-5 shadow-sm">{children}</section>
}
function OutLink({ url, children }: { url: string; children: ReactNode }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full border border-edge bg-surface-tertiary px-3 py-2 text-caption text-accent-on underline underline-offset-2">{children} ↗</a>
}

export function PracticalPanels({ state }: Props) {
  const [routeDay, setRouteDay] = useState('d1')
  const file = useRef<HTMLInputElement>(null)
  const day = trip.days.find(d => d.id === routeDay) || trip.days[0]
  const total = trip.costs.filter(c => state.local.costs[c.id]).reduce((sum, c) => sum + c.amount, 0)
  return (
    <div className="space-y-4 text-content-secondary">
      {state.tab === 'routes' && <>
        <div className="flex flex-wrap gap-2">{trip.days.map(d => <button key={d.id} className={`${button} ${d.id === day.id ? 'bg-accent-subtle text-accent-on' : ''}`} aria-pressed={d.id === day.id} onClick={() => setRouteDay(d.id)}>{d.short}</button>)}</div>
        <Card><h2 className="mb-2 text-subtitle font-bold text-content">{day.title}</h2><p>{day.summary}</p><p className="mt-3 font-medium text-warning">{day.reminder}</p></Card>
        {day.routes.map(route => <Card key={route.id}>
          <h3 className="text-subtitle font-bold text-content">{route.title}</h3><p className="my-3 text-caption">{route.description}</p>
          <div className="flex flex-wrap gap-2">{route.legs.map(([a, b, label, mode], i) => <OutLink key={i} url={navigation(a, b, mode)}>{label} · {mode === 'walking' ? '步行' : '公共交通'}</OutLink>)}</div>
        </Card>)}
        {day.quickLinks.length > 0 && <Card><h3 className="mb-3 text-subtitle font-bold text-content">当日接驳快捷导航</h3><div className="flex flex-wrap gap-2">{day.quickLinks.map(link => <OutLink key={link.title} url={link.url}>{link.title}</OutLink>)}</div></Card>}
        <h2 className="pt-5 text-subtitle font-bold text-content">临时状况与备选措施</h2>
        <div className="grid gap-4 md:grid-cols-2">{trip.contingencies.map(c => <Card key={c.id}><h3 className="font-bold text-content">{c.title}</h3><p className="my-2 text-caption text-warning">触发参考：{c.trigger}</p><ol className="list-decimal space-y-2 ps-5 text-caption">{c.steps.map(s => <li key={s}>{s}</li>)}</ol><div className="mt-4 flex flex-wrap gap-2">{c.routes.map(([a, b, label, mode], i) => <OutLink key={i} url={navigation(a, b, mode)}>{label}</OutLink>)}</div></Card>)}</div>
      </>}
      {state.tab === 'costs' && <>
        <Card><h2 className="text-subtitle font-bold text-content">费用参考与试算</h2><p className="mt-2">勾选计划采用的项目，按每项一份试算。价格保留原核验日期，出发前再确认；车票和住宿未提供金额的部分不计入。</p><p className="mt-4 text-title font-bold text-content" data-testid="cost-total">已选合计 ¥{total.toLocaleString()} JPY</p><p className="mt-1 text-caption">这是预算试算，未记录实际付款。</p></Card>
        {trip.costs.map(c => <Card key={c.id}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1" checked={!!state.local.costs[c.id]} onChange={e => state.check('costs', c.id, e.target.checked)} /><span className="flex-1"><strong className="text-content">{c.name}</strong><span className="ms-3 font-bold">¥{c.amount} / {c.unit}</span><span className="mt-2 block text-caption">{c.note}</span><span className="mt-1 block text-caption text-content-faint">{c.status} · 核验 {c.checked}</span></span></label><div className="mt-3"><OutLink url={trip.sources[c.source as keyof typeof trip.sources].url}>官方来源</OutLink></div></Card>)}
        <Card><h3 className="mb-2 font-bold text-content">尚未计入</h3><ul className="list-disc space-y-2 ps-5 text-caption">{trip.unpriced.map(s => <li key={s}>{s}</li>)}</ul></Card>
      </>}
      {state.tab === 'notes' && <>
        <Card><h2 className="text-subtitle font-bold text-content">本机备忘与备份</h2><p className="my-3 text-caption">备忘和勾选保存在当前浏览器；换手机、清理网站数据之前请导出备份。导入时会追加不同的备忘，已有文字会保留。</p><div className="flex flex-wrap gap-2"><button className={button} onClick={state.exportBackup}>导出备份</button><button className={button} onClick={() => file.current?.click()}>导入备份</button><button className={button} onClick={state.exportTrip}>导出完整行程 Markdown</button><button className={button} onClick={() => window.print()}>打印 / 保存 PDF</button><input ref={file} hidden type="file" accept=".json,application/json" onChange={e => { const selected = e.target.files?.[0]; if (selected) void state.importBackup(selected); e.target.value = '' }} /></div><p role="status" className="mt-3 text-caption">{state.message}</p><label className="mt-3 block font-bold text-content" htmlFor="general-notes">总备忘</label><textarea id="general-notes" className="mt-2 min-h-36 w-full rounded-xl border border-edge bg-surface-input p-3 text-content" maxLength={12000} value={state.local.notes.general || ''} onChange={e => state.note('general', e.target.value)} placeholder="例如：证件、网络、取行李提醒……" /></Card>
        <div className="grid gap-4 md:grid-cols-2">{trip.days.map(d => <Card key={d.id}><label className="block font-bold text-content" htmlFor={`notes-${d.id}`}>{d.short} · {d.title}</label><p className="my-2 text-caption">{d.reminder}</p><textarea id={`notes-${d.id}`} className="mt-2 min-h-28 w-full rounded-xl border border-edge bg-surface-input p-3 text-content" maxLength={6000} value={state.local.notes[d.id] || ''} onChange={e => state.note(d.id, e.target.value)} placeholder="这一天的个人备忘" /></Card>)}</div>
        <h2 className="pt-4 text-subtitle font-bold text-content">出发前待办</h2>
        {trip.todos.map(t => <Card key={t.id}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1" checked={!!state.local.tasks[t.id]} onChange={e => state.check('tasks', t.id, e.target.checked)} /><span><strong className="text-content">{t.title}</strong><span className="ms-2 text-caption text-warning">{t.priority}</span><span className="mt-2 block text-caption">{t.detail}</span></span></label></Card>)}
      </>}
    </div>
  )
}
