import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const trip = JSON.parse(fs.readFileSync(path.join(root, 'trip.json'), 'utf8'));
assert.equal(trip.days.length, 5);
assert.equal(trip.flights.length, 4);
assert.equal(Object.keys(trip.places).length, 26);
assert.match(trip.days[2].summary, /中午/);
assert.match(trip.days[3].reminder, /12:30/);
assert.match(trip.days[3].reminder, /16A/);
assert.equal(trip.publication.personalNotesIncluded, false);
assert.equal(trip.localNotes, undefined);
assert.equal(trip.localChecklist, undefined);
assert.equal(trip.localBudget, undefined);
const ids = new Set();
for (const d of trip.days) {
  assert(d.routes.some(r => r.id === d.focusRoute));
  for (const e of d.events) { assert(['confirmed','option','pending'].includes(e.status)); if(e.place)assert(trip.places[e.place]);if(e.source)assert(trip.sources[e.source]); }
  for (const r of d.routes) {
    assert(!ids.has(r.id));ids.add(r.id);
    r.points.forEach(p => assert(trip.places[p]));
    r.legs.forEach(([a,b,,mode]) => {assert(trip.places[a]&&trip.places[b]);assert(['walking','transit'].includes(mode));});
  }
  for (const l of d.quickLinks) {const url = new URL(l.url);assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('api'),'1');}
}
for(const c of trip.costs)assert(Number.isFinite(c.amount)&&c.amount>=0&&trip.sources[c.source]);
for(const s of Object.values(trip.sources))assert.equal(new URL(s.url).protocol,'https:');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const a of [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m=>m[1]))assert(fs.existsSync(path.join(root,a)),a);
assert(!html.includes('href="/style.css"'));
assert(fs.existsSync(path.join(root,'.nojekyll')));
for(const file of ['app.js','backup.js'])execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
const require=createRequire(import.meta.url);
const {validate,mergeNotes}=require('../backup.js');
const backup={localNotes:{d4:'提前取行李',general:'手机备份'},localChecklist:{'train-choice':true},localBudget:{todaiji:true}};
const parsed=validate(backup,trip);
assert.equal(parsed.notes.d4,'提前取行李');
assert.equal(mergeNotes({general:'原有备忘'},parsed.notes).general,'原有备忘\n\n—— 导入备忘 ——\n手机备份');
assert.equal(mergeNotes(mergeNotes({},parsed.notes),parsed.notes).general,'手机备份');
assert.throws(()=>validate({localNotes:[],localChecklist:{},localBudget:{}},trip));
assert.throws(()=>validate({...backup,localNotes:{d4:'x'.repeat(6001)}},trip));
const serialized=JSON.stringify(trip);
assert(!/(?:encryptionKey|password|Authorization|Bearer |ghp_|BEGIN PRIVATE KEY|C:\\\\Users)/i.test(serialized));
console.log(`PASS: ${trip.days.length}天、${Object.keys(trip.places).length}地点、${ids.size}路线；最新日期、相对资源路径、本机备忘导入和静态发布范围检查通过。`);
