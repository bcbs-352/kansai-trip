/* Canonical trip data lives in trip.json. Browser state only stores local notes,
   checklist ticks, budget selections and UI choices; it never confirms a route. */
'use strict';
const STORAGE_KEY='kansai-planner-local-v1';
const safeLink=url=>{try{const u=new URL(url);return u.protocol==='https:'?esc(u.href):'#';}catch{return '#';}};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('zh-CN').format(n);
const icon=n=>`<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
let trip, state={}, map, mapLayer, markers={}, activeDay='d1', activeRoute, toastTimer, tileLoaded=false;
try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');if(s&&typeof s==='object'&&!Array.isArray(s))state=s;}catch{}
state.tasks=state.tasks&&typeof state.tasks==='object'?state.tasks:{};
state.notes=state.notes&&typeof state.notes==='object'?state.notes:{};
state.costs=state.costs&&typeof state.costs==='object'?state.costs:{};
state.routes=state.routes&&typeof state.routes==='object'?state.routes:{};
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{toast('浏览器无法保存，请导出备忘备份。');return false;}}
function searchUrl(id){const p=trip.places[id];return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`;}
function directions(from,to,mode='transit'){return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(trip.places[from].query)}&destination=${encodeURIComponent(trip.places[to].query)}&travelmode=${mode}`;}
function sourceLink(id,label='官方信息 ↗'){const s=trip.sources[id];return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function getDay(){return trip.days.find(d=>d.id===activeDay);}
function getRoute(){return getDay().routes.find(r=>r.id===activeRoute)||getDay().routes[0];}
function setDay(id,scroll=false){
  if(!trip.days.some(d=>d.id===id))return;
  activeDay=id;state.day=id;
  const d=getDay();activeRoute=d.routes.some(r=>r.id===state.routes[id])?state.routes[id]:d.focusRoute;
  save();renderDayTabs();renderDay();renderRouteTabs();renderMap();
  if(scroll)$('#itinerary').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderDayTabs(){
  $('#day-tabs').innerHTML=trip.days.map((d,i)=>`<button class="day-tab" role="tab" id="tab-${d.id}" aria-controls="day-panel" aria-selected="${d.id===activeDay}" tabindex="${d.id===activeDay?0:-1}" data-day="${d.id}"><span class="tab-top"><span class="tab-date">${d.short}</span><span class="tab-week">${d.weekday}</span></span><span class="tab-city">${d.city}</span></button>`).join('');
  $('#rail-days').innerHTML=trip.days.map(d=>`<button class="rail-day" data-day="${d.id}" aria-current="${d.id===activeDay}"><span>${d.short}</span>${d.city}</button>`).join('');
}
function renderDay(){
  const d=getDay(),index=trip.days.indexOf(d)+1;$('#day-panel').setAttribute('aria-labelledby',`tab-${d.id}`);
  $('#day-panel').innerHTML=`<div class="day-header"><span class="day-number">${String(index).padStart(2,'0')}</span><div><div class="day-kicker mono">${d.en}</div><h3 class="day-title">${esc(d.title)}</h3></div></div><p class="day-summary">${esc(d.summary)}</p><div class="reminder">${esc(d.reminder)}</div><ol class="timeline">${d.events.map(e=>`<li class="event ${e.status}"><div class="event-meta"><span class="event-time">${esc(e.time)}</span><span class="badge ${e.status}">${esc(e.tag)}</span></div><h4>${esc(e.title)}</h4><p>${esc(e.detail)}</p><div class="event-links">${e.place?`<button class="event-link" data-place="${e.place}">${icon('pin')}地图位置</button><a class="event-link" href="${searchUrl(e.place)}" target="_blank" rel="noopener noreferrer">地点详情 ↗</a>`:''}${e.source?`<span class="event-link">${sourceLink(e.source)}</span>`:''}</div></li>`).join('')}</ol><div class="stay-mini">${icon('bag')}<div><strong>${esc(d.stay)}</strong><p>${esc(d.stayStatus)} · ${esc(d.stayDetail)}</p></div></div>${d.quickLinks?.length?`<div class="quick-links"><h4>当日交通快捷导航</h4>${d.quickLinks.map(l=>`<a href="${safeLink(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)} ↗</a>`).join('')}</div>`:''}<label class="day-note-label" for="day-note">当天备忘<span>自动保存到本机</span></label><textarea id="day-note" rows="3" maxlength="6000" placeholder="记录这一天要留意的事情…">${esc(state.notes[d.id]||'')}</textarea>`;
  $('#day-note').addEventListener('input',e=>{state.notes[d.id]=e.target.value;save();});
}
function renderRouteTabs(){
  $('#route-tabs').innerHTML=getDay().routes.map(r=>`<button class="route-tab" data-route="${r.id}" aria-pressed="${activeRoute===r.id}">${esc(r.title)}</button>`).join('');
}
function initMap(){
  if(!window.L){$('#map-fallback').hidden=false;return;}
  map=L.map('map',{scrollWheelZoom:false,zoomControl:false}).setView([34.686,135.84],13);
  L.control.zoom({position:'bottomright'}).addTo(map);
  L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(map);
  tiles.on('tileload',()=>{tileLoaded=true;$('#map-fallback').hidden=true;});
  tiles.on('tileerror',()=>{if(!tileLoaded)$('#map-fallback').hidden=false;});
  setTimeout(()=>{if(!tileLoaded)$('#map-fallback').hidden=false;},7000);
  mapLayer=L.featureGroup().addTo(map);
  window.addEventListener('resize',()=>{map.invalidateSize();});
}
function renderMap(){
  const r=getRoute();$('#route-description').textContent=r.description;
  $('#route-list').innerHTML=r.points.map((id,i)=>`<button class="map-place" data-place="${id}"><span>${i+1}</span>${esc(trip.places[id].name)}</button>`).join('');
  $('#route-links').innerHTML=r.legs.map(([from,to,label,mode])=>`<a class="route-link" href="${directions(from,to,mode)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span>${mode==='walking'?'步行':'公共交通'} ↗</span></a>`).join('');
  if(!map)return;
  mapLayer.clearLayers();markers={};
  const pts=r.points.map(id=>[trip.places[id].lat,trip.places[id].lng]);
  L.polyline(pts,{color:r.mode==='walking'?'#a45d37':'#24483c',weight:2.5,dashArray:'5,7',opacity:.8,interactive:false}).addTo(mapLayer);
  r.points.forEach((id,i)=>{
    const p=trip.places[id],marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'numbered-marker',html:`<span class="marker-dot">${i+1}</span>`,iconSize:[29,29],iconAnchor:[14,14]}),title:p.name,alt:p.name});
    marker.bindPopup(`<strong>${esc(p.name)}</strong>${p.approx?'<small>地址／入口附近示意，请通过地点名称核对</small>':''}<a href="${searchUrl(id)}" target="_blank" rel="noopener noreferrer">在 Google Maps 查看 ↗</a>`).addTo(mapLayer);markers[id]=marker;
  });
  requestAnimationFrame(()=>{map.invalidateSize();map.fitBounds(mapLayer.getBounds(),{padding:[36,45],maxZoom:15,animate:false});});
}
function focusPlace(id){
  const p=trip.places[id];if(!p)return;
  $('#routes').scrollIntoView({behavior:'smooth',block:'start'});
  if(!map){toast('地图底图不可用，请使用地点详情或分段导航。');return;}
  if(!markers[id]){
    const route=getDay().routes.find(r=>r.points.includes(id));
    if(route){activeRoute=route.id;state.routes[activeDay]=route.id;save();renderRouteTabs();renderMap();}
    else{markers[id]=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'numbered-marker',html:'<span class="marker-dot">•</span>',iconSize:[29,29],iconAnchor:[14,14]}),title:p.name}).addTo(mapLayer).bindPopup(`<strong>${esc(p.name)}</strong><a href="${searchUrl(id)}" target="_blank" rel="noopener noreferrer">在地图中查看 ↗</a>`);}
  }
  setTimeout(()=>{map.invalidateSize();map.setView([p.lat,p.lng],15,{animate:!window.matchMedia('(prefers-reduced-motion: reduce)').matches});markers[id]?.openPopup();},180);
}
function selectedCosts(){return trip.costs.filter(c=>state.costs[c.id]);}
function updateTotals(){
  const total=selectedCosts().reduce((s,c)=>s+c.amount,0);
  const parsed=Number($('#people').value);const people=Number.isFinite(parsed)?Math.max(1,Math.min(20,Math.floor(parsed))):1;
  state.people=people;$('#cost-total').textContent=fmt(total);$('#group-total').textContent=`¥${fmt(total*people)}`;save();
}
function renderCosts(){
  trip.costs.forEach(c=>{if(typeof state.costs[c.id]!=='boolean')state.costs[c.id]=c.default;});
  $('#cost-list').innerHTML=trip.costs.map(c=>`<div class="cost-row"><input id="cost-${c.id}" type="checkbox" data-cost="${c.id}" ${state.costs[c.id]?'checked':''} aria-label="计入${esc(c.name)}"><div><label class="cost-name" for="cost-${c.id}">${esc(c.name)}</label><p class="cost-meta">${esc(c.category)} · ${esc(c.status)} · ${esc(c.checked)}</p><p class="cost-note">${esc(c.note)}</p><span class="cost-source">${sourceLink(c.source,'票价来源 ↗')}</span></div><div class="cost-amount">${c.amount===0?'免费':`¥${fmt(c.amount)}`}<small>${esc(c.unit)}</small></div></div>`).join('');
  $('#people').value=Number.isInteger(state.people)&&state.people>=1&&state.people<=20?state.people:1;
  $('#unpriced').innerHTML=trip.unpriced.map(t=>`<li>${esc(t)}</li>`).join('');updateTotals();
}
function renderTasks(){
  $('#task-list').innerHTML=trip.todos.map(t=>`<label class="task-card ${state.tasks[t.id]?'completed':''}"><input type="checkbox" data-task="${t.id}" ${state.tasks[t.id]?'checked':''}><div><div class="task-top"><span>${esc(t.group)}</span><em>${esc(t.priority)}</em></div><strong>${esc(t.title)}</strong><p>${esc(t.detail)}</p></div></label>`).join('');
  $('#task-progress').textContent=`${trip.todos.filter(t=>state.tasks[t.id]).length} / ${trip.todos.length} 已完成`;
}
function renderFlights(){
  $('#flight-list').innerHTML=trip.flights.map(f=>`<article class="flight-card"><div class="flight-top"><strong>${f.number}</strong><span>${f.date} · 东方航空</span></div><div class="flight-route"><div><b>${f.departure}</b><p>${esc(f.from)}</p></div><div class="flight-line">${icon('plane')}</div><div><b>${f.arrival}</b><p>${esc(f.to)}</p></div></div><p class="flight-note">${esc(f.note)}</p></article>`).join('');
  $('#stay-list').innerHTML=trip.days.slice(0,4).map(d=>`<article class="stay-card"><span class="mono">${d.short} · 1 NIGHT</span><h4>${esc(d.stay)}</h4><p>${esc(d.stayStatus)}<br>${esc(d.stayDetail)}</p>${d.stayPlace?`<a href="${searchUrl(d.stayPlace)}" target="_blank" rel="noopener noreferrer">住宿位置 ↗</a>`:''}</article>`).join('');
}
function renderContingencies(){
  $('#contingency-list').innerHTML=trip.contingencies.map((c,i)=>`<details class="contingency"><summary><span>${String(i+1).padStart(2,'0')}</span>${esc(c.title)}</summary><div class="contingency-body"><p>${esc(c.trigger)}</p><ol>${c.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${c.routes.map(([from,to,label,mode])=>`<a href="${directions(from,to,mode)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('　')}${c.source?`<br>${sourceLink(c.source)}`:''}</div></details>`).join('');
}
function exportMarkdown(){
  let md=`# ${trip.title}\n\n${trip.dates} · 更新 ${trip.updated}\n\n${trip.note}\n\n`;
  for(const d of trip.days){md+=`## ${d.short} ${d.weekday}｜${d.city}\n\n${d.summary}\n\n住宿：${d.stay}（${d.stayStatus}）\n\n注意：${d.reminder}\n\n`;
    md+=d.events.map(e=>`- **${e.time}｜${e.title}**（${e.tag}）\n  ${e.detail}${e.place?`\n  地点：${searchUrl(e.place)}`:''}`).join('\n')+'\n\n';
    for(const r of d.routes){md+=`### ${r.title}\n\n${r.description}\n\n`+r.legs.map(([a,b,l,m])=>`- [${l}](${directions(a,b,m)})`).join('\n')+'\n\n';}
    if(d.quickLinks?.length)md+='### 当日交通快捷导航\n\n'+d.quickLinks.map(l=>`- [${l.title}](${l.url})`).join('\n')+'\n\n';
    if(state.notes[d.id])md+=`当天备忘：\n\n${state.notes[d.id]}\n\n`;
  }
  md+='## 航班\n\n'+trip.flights.map(f=>`- ${f.date} ${f.number} ${f.from} ${f.departure} → ${f.to} ${f.arrival}（${f.note}）`).join('\n')+'\n\n';
  md+='## 费用参考（非总预算，未代表支付）\n\n'+trip.costs.map(c=>`- [${state.costs[c.id]?'x':' '}] ${c.name}：¥${c.amount} / ${c.unit}；${c.status} ${c.checked}。${c.note}\n  来源：${trip.sources[c.source].url}`).join('\n')+'\n\n';
  md+=`已选成人每人小计：¥${selectedCosts().reduce((s,c)=>s+c.amount,0)}。\n\n尚未计入：${trip.unpriced.join('；')}。\n\n`;
  md+='## 行前待办\n\n'+trip.todos.map(t=>`- [${state.tasks[t.id]?'x':' '}] ${t.title}：${t.detail}`).join('\n')+'\n\n';
  md+='## 临时状况处理（建议）\n\n'+trip.contingencies.map(c=>`### ${c.title}\n\n触发参考：${c.trigger}\n\n${c.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n`).join('\n')+'\n';
  if(state.notes.general)md+=`## 我的备忘\n\n${state.notes.general}\n`;
  download('关西旅行计划_含备忘.md',md,'text/markdown;charset=utf-8');toast('已导出完整行程、导航链接、费用与备忘。');
}
function preparePrint(){
  let old=$('#print-itinerary');if(old)old.remove();
  const div=document.createElement('div');div.className='print-only';div.id='print-itinerary';
  div.innerHTML=trip.days.map(d=>`<article class="print-day"><h2>${d.short} ${d.weekday} · ${d.city}</h2><p>${esc(d.summary)}</p><p>住宿：${esc(d.stay)}（${esc(d.stayStatus)}）</p><p>${esc(d.reminder)}</p>${d.events.map(e=>`<div class="print-event"><b>${esc(e.time)} ${esc(e.title)}</b><span>［${esc(e.tag)}］</span><p>${esc(e.detail)}</p></div>`).join('')}${d.routes.map(r=>`<p class="print-route"><b>${esc(r.title)}：</b>${r.points.map(p=>esc(trip.places[p].name)).join(' → ')}<br>${esc(r.description)}</p>`).join('')}${state.notes[d.id]?`<p>当天备忘：${esc(state.notes[d.id])}</p>`:''}</article>`).join('');
  $('.daily-layout').prepend(div);
}
function attachEvents(){
  document.addEventListener('click',e=>{
    const day=e.target.closest('[data-day]');if(day){setDay(day.dataset.day,day.classList.contains('rail-day'));return;}
    const route=e.target.closest('[data-route]');if(route){activeRoute=route.dataset.route;state.routes[activeDay]=activeRoute;save();renderRouteTabs();renderMap();return;}
    const place=e.target.closest('[data-place]');if(place){focusPlace(place.dataset.place);return;}
    const nav=e.target.closest('[data-nav]');if(nav){document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n===nav));}
  });
  $('#day-tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();let i=trip.days.findIndex(d=>d.id===activeDay);
    i=e.key==='Home'?0:e.key==='End'?trip.days.length-1:(i+(e.key==='ArrowRight'?1:-1)+trip.days.length)%trip.days.length;
    setDay(trip.days[i].id);$(`#tab-${activeDay}`).focus();
  });
  $('#fit-map').addEventListener('click',()=>{if(map&&mapLayer.getLayers().length){map.invalidateSize();map.fitBounds(mapLayer.getBounds(),{padding:[36,45],maxZoom:15});}else toast('底图不可用，请查看下方地点清单与导航。');});
  $('#cost-list').addEventListener('change',e=>{if(e.target.dataset.cost){state.costs[e.target.dataset.cost]=e.target.checked;updateTotals();}});
  $('#people').addEventListener('input',updateTotals);
  $('#people').addEventListener('change',()=>{$('#people').value=state.people;});
  $('#task-list').addEventListener('change',e=>{if(e.target.dataset.task){state.tasks[e.target.dataset.task]=e.target.checked;save();renderTasks();const checkbox=document.querySelector(`[data-task="${e.target.dataset.task}"]`);checkbox?.focus();}});
  $('#general-notes').value=state.notes.general||'';
  $('#general-notes').addEventListener('input',e=>{state.notes.general=e.target.value;$('#notes-status').textContent=save()?'已保存到当前浏览器':'保存失败，请导出';});
  $('#export-button').addEventListener('click',exportMarkdown);
  $('#download-data').addEventListener('click',()=>{download('关西旅行计划_数据备份.json',JSON.stringify({trip,localNotes:state.notes,localChecklist:state.tasks,localBudget:state.costs,exportedAt:new Date().toISOString()},null,2),'application/json');toast('已导出行程数据和本机备忘，可发回聊天继续维护。');});
  $('#notes-export').addEventListener('click',()=>{
    let text=`# 关西旅行备忘\n\n导出时间：${new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})} 北京时间\n\n## 通用备忘\n\n${state.notes.general||'（暂无）'}\n\n`;
    text+=trip.days.map(d=>`## ${d.short} ${d.city}\n\n${state.notes[d.id]||'（暂无）'}\n`).join('\n')+'\n## 待办勾选\n\n'+trip.todos.map(t=>`- [${state.tasks[t.id]?'x':' '}] ${t.title}`).join('\n');
    download('关西旅行_我的备忘.md',text,'text/markdown;charset=utf-8');toast('已导出本机备忘与待办记录。');
  });
  $('#import-backup').addEventListener('click',()=>$('#backup-file').click());
  $('#backup-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>2000000)throw new Error('备份文件过大');
      const backup=JSON.parse(await file.text());
      const imported=window.KansaiBackup.validate(backup,trip);
      if(!confirm('合并此备份中的备忘和勾选？同名备忘会追加到现有内容，不修改正式行程。'))return;
      state.notes=window.KansaiBackup.mergeNotes(state.notes,imported.notes);
      state.tasks={...state.tasks,...imported.tasks};state.costs={...state.costs,...imported.costs};
      save();renderDay();renderTasks();renderCosts();$('#general-notes').value=state.notes.general||'';
      toast('已导入本机备忘与勾选。正式行程未改变。');
    }catch(error){toast('导入失败：'+error.message);}finally{e.target.value='';}
  });
  $('#print-button').addEventListener('click',()=>{preparePrint();window.print();});window.addEventListener('beforeprint',preparePrint);
}
async function init(){
  try{
    const res=await fetch('./trip.json',{cache:'no-cache'});if(!res.ok)throw new Error('无法读取行程');
    trip=await res.json();
    activeDay=trip.days.some(d=>d.id===state.day)?state.day:'d1';
    $('#updated').textContent=`静态行程 · ${trip.updated.slice(5).replace('-','.')} 更新`;
    initMap();attachEvents();setDay(activeDay);renderCosts();renderTasks();renderFlights();renderContingencies();
    $('#changes').innerHTML=trip.changes.map(c=>`<div class="change"><time>${esc(c.date)}</time><span>${esc(c.text)}</span></div>`).join('');
    $('#source-links').innerHTML=Object.values(trip.sources).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join('');
  }catch(error){
    const note=document.createElement('p');note.className='error-note';note.textContent='行程加载失败。请刷新页面重试；若正在双击本地HTML，请改用本地预览服务或已发布网址。';$('#itinerary').append(note);console.error(error);
  }
}
init();
