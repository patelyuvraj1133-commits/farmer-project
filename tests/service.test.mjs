import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Exercise the real service and generated schema against SQLite. Authentication
// is supplied at this service boundary; the live route uses dispatch-owned SIWC.
const dir=resolve('.sites-runtime/service-tests');mkdirSync(dir,{recursive:true});
for(const name of ['domain','service']) {
 const source=readFileSync(`lib/${name}.ts`,'utf8').replace('from "./domain"','from "./domain.mjs"');
 writeFileSync(`${dir}/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
const {handleApi}=await import(pathToFileURL(`${dir}/service.mjs`).href);
const {haversine,estimateWait,indiaDate,amountPaise}=await import(pathToFileURL(`${dir}/domain.mjs`).href);
const RealDate=Date;let clock='2026-09-14T02:30:00.000Z';
globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[clock]));}static now(){return new RealDate(clock).getTime();}};
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
sql.exec(readFileSync('drizzle/0000_fearless_the_renegades.sql','utf8'));
const db={prepare(source){return make(source,[]);},async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.execute());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
function make(source,args){return {bind(...bound){return make(source,bound);},execute(){const p=sql.prepare(source);const results=p.all(...args);const changes=Number(sql.prepare('SELECT changes() AS n').get().n);return {results,success:true,meta:{changes,duration:0,last_row_id:0}};},async all(){return this.execute();},async first(column){const row=this.execute().results[0]||null;return column?row?.[column]:row;},async run(){return this.execute();}};}
const owner={userId:'owner',email:'owner@example.test',displayName:'Owner'};
const farmer={userId:'farmer-1',email:'farmer1@example.test',displayName:'Farmer One'};
const farmer2={userId:'farmer-2',email:'farmer2@example.test',displayName:'Farmer Two'};
const staff1={userId:'staff-1',email:'staff1@example.test',displayName:'Staff One'};
const staff2={userId:'staff-2',email:'staff2@example.test',displayName:'Staff Two'};
const profile={name:'Test Farmer',phone:'9876543210',village:'Test Village'};
let mandi1,mandi2,crop1,crop2,booking1,booking2;
async function request(user,path,data,extra={}) {
 const response=await handleApi(db,user,new Request(`https://mandimitra.example/api/${path}`,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json','X-MandiMitra-Client':'web','Origin':'https://mandimitra.example',...extra},body:data===undefined?undefined:JSON.stringify(data)}),true);
 return {status:response.status,data:await response.json()};
}
async function ok(user,path,data,expected=200){const r=await request(user,path,data);assert.equal(r.status,expected,JSON.stringify(r.data));return r.data;}
const config={name:'Test Procurement Centre',district:'Test District',address:'Test address, for automated verification only',latitude:23.2,longitude:77.4,capacity:2,service_minutes:10,desks:1,open_hour:9,close_hour:17,opening_days:[0,1,2,3,4,5,6],accepted_crops:['Wheat','Soybean'],active:true};

test('anonymous writes, cross-origin writes, missing client header, and malformed payloads are rejected',async()=>{
 assert.equal((await request(null,'profile',profile)).status,401);
 assert.equal((await request(owner,'profile',profile,{'Origin':'https://attacker.example'})).status,403);
 assert.equal((await request(owner,'profile',profile,{'X-MandiMitra-Client':''})).status,403);
 assert.equal((await request(owner,'profile',{...profile,phone:'123'})).status,400);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);
});
test('disabled bootstrap never grants administrator to the first registration', async () => {
 sql.exec('BEGIN');
 try {
  const response = await handleApi(db, owner, new Request('https://mandimitra.example/api/profile', {
   method: 'POST',
   headers: {'Content-Type':'application/json','X-MandiMitra-Client':'web','Origin':'https://mandimitra.example'},
   body: JSON.stringify({...profile, name:'Owner'}),
  }), false);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.role, 'farmer');
  assert.equal(body.user.verified, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n, 0);
 } finally {
  sql.exec('ROLLBACK');
 }
});
test('owner-private bootstrap creates one admin and later accounts remain farmers',async()=>{
 const first=await ok(owner,'profile',{...profile,name:'Owner'});assert.equal(first.user.role,'admin');assert.equal(first.user.verified,1);
 mandi1=(await ok(owner,'mandis',config)).id;mandi2=(await ok(owner,'mandis',{...config,name:'Second Test Centre'})).id;
 for(const u of [farmer,farmer2,staff1,staff2]){const result=await ok(u,'profile',{...profile,name:u.displayName,mandi_id:u===staff2?mandi2:mandi1});assert.equal(result.user.role,'farmer');assert.equal(result.user.verified,0);}
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n,1);
});
test('admin assigns scoped staff; farmers cannot use staff endpoints',async()=>{
 await ok(owner,'staff/role',{user_id:staff1.userId,role:'staff',mandi_id:mandi1});await ok(owner,'staff/role',{user_id:staff2.userId,role:'staff',mandi_id:mandi2});
 assert.equal((await request(farmer,'staff')).status,403);assert.equal((await request(staff1,'mandis',config)).status,403);
 assert.equal((await request(staff2,'staff/verify',{user_id:farmer.userId,verified:true})).status,403);
 assert.equal((await request(owner,'staff/role',{user_id:owner.userId,role:'farmer'})).status,409);
 const people=await ok(staff1,'staff/users');assert(people.users.every(u=>u.mandi_id===mandi1&&u.role==='farmer'));
 assert.deepEqual((await ok(staff1,"staff/users?q=' OR 1=1 --")).users,[]);
});
test('crop registration, farmer verification, and booking validation',async()=>{
 crop1=(await ok(farmer,'crops',{name:'Wheat',variety:'Test',quantity_kg:501.25,season:'Test season'},201)).id;
 crop2=(await ok(farmer2,'crops',{name:'Soybean',variety:'',quantity_kg:500,season:'Test season'},201)).id;
 const body={id:crypto.randomUUID(),crop_id:crop1,mandi_id:mandi1,date:indiaDate(),slot:9};
 assert.equal((await request(farmer,'bookings',body)).status,403);
 await ok(staff1,'staff/verify',{user_id:farmer.userId,verified:true});await ok(staff1,'staff/verify',{user_id:farmer2.userId,verified:true});
 assert.equal((await request(farmer,'bookings',{...body,date:'2026-02-30'})).status,400);
 assert.equal((await request(farmer,'bookings',{...body,slot:8})).status,409);
 assert.equal((await request(farmer,'bookings',{...body,crop_id:crop2})).status,404);
 assert.equal((await request(farmer,'crops',{name:'Wheat',quantity_kg:-1,season:'X'})).status,400);
 booking1=(await ok(farmer,'bookings',body,201)).booking;assert.equal(booking1.sequence,1);
 const retry=await ok(farmer,'bookings',body);assert.equal(retry.booking.id,booking1.id);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM events WHERE booking_id=?').get(booking1.id).n,1);
 booking2=(await ok(farmer2,'bookings',{id:crypto.randomUUID(),crop_id:crop2,mandi_id:mandi1,date:indiaDate(),slot:9},201)).booking;assert.equal(booking2.sequence,2);
 assert.equal((await request(farmer,'bookings',{...body,id:crypto.randomUUID(),slot:10})).status,409);
 assert.equal((await request(farmer,'bookings',{...body,id:crypto.randomUUID(),date:'2026-09-15'})).status,409);
});
test('concurrent booking requests cannot overbook a slot, duplicate a farmer, or reuse a lot',async()=>{
 const candidates=[];
 for(let i=0;i<10;i++) {const u={userId:`load-${i}`,email:`load${i}@example.test`,displayName:`Load ${i}`};await ok(u,'profile',{...profile,name:u.displayName,mandi_id:mandi1});await ok(staff1,'staff/verify',{user_id:u.userId,verified:true});const crop=(await ok(u,'crops',{name:'Wheat',quantity_kg:100,variety:'',season:'Test'},201)).id;candidates.push({u,crop});}
 const results=await Promise.all(candidates.map(({u,crop})=>request(u,'bookings',{id:crypto.randomUUID(),crop_id:crop,mandi_id:mandi1,date:indiaDate(),slot:10})));
 assert.equal(results.filter(r=>r.status===201).length,2);assert.equal(results.filter(r=>r.status===409).length,8);
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM bookings WHERE mandi_id=? AND slot=10 AND status<>'cancelled'").get(mandi1).n,2);
});
test('booking details and operational writes are private and scoped',async()=>{
 assert.equal((await request(farmer2,`booking/${booking1.id}`)).status,403);
 assert.equal((await request(staff2,`booking/${booking1.id}`)).status,403);
 assert.equal((await request(farmer,'booking/update',{id:booking1.id,version:0,action:'checkin'})).status,403);
 assert.equal((await request(staff2,'booking/update',{id:booking1.id,version:0,action:'checkin'})).status,403);
 const publicQueue=await ok(null,`queue?mandi_id=${mandi1}`);assert.equal(publicQueue.mine,null);assert(!JSON.stringify(publicQueue).includes('9876543210'));
 assert.equal((await request(owner,'mandis',{...config,id:mandi1,capacity:1})).status,409);
});
test('queue respects slot/sequence order and enforces weighing desk capacity',async()=>{
 booking2=(await ok(staff1,'booking/update',{id:booking2.id,version:0,action:'checkin'})).booking;
 booking1=(await ok(staff1,'booking/update',{id:booking1.id,version:0,action:'checkin'})).booking;
 let q=await ok(farmer2,`queue?mandi_id=${mandi1}`);assert.equal(q.ahead,1);assert.equal(q.eta_minutes,10);
 const call=await ok(staff1,'staff/call-next',{mandi_id:mandi1});assert.equal(call.booking.id,booking1.id);booking1=call.booking;
 assert.equal((await request(staff1,'staff/call-next',{mandi_id:mandi1})).status,409);
 q=await ok(farmer2,`queue?mandi_id=${mandi1}`);assert.equal(q.ahead,0);assert.equal(q.eta_minutes,10);
 assert.equal((await request(staff1,'booking/update',{id:booking1.id,version:booking1.version,action:'pay',payment_reference:'bad-ref'})).status,409);
});
test('weighing, procurement, external payment, audit history, and optimistic concurrency work',async()=>{
 booking1=(await ok(staff1,'booking/update',{id:booking1.id,version:booking1.version,action:'weigh'})).booking;
 const weighVersion=booking1.version;
 const attempts=await Promise.all([1,2].map(()=>request(staff1,'booking/update',{id:booking1.id,version:weighVersion,action:'procure',weight_kg:499.25,rate_rupees:24.15})));
 assert.equal(attempts.filter(r=>r.status===200).length,1);assert.equal(attempts.filter(r=>r.status===409).length,1);
 booking1=attempts.find(r=>r.status===200).data.booking;assert.equal(booking1.amount_paise,1205689);
 assert.equal((await request(staff1,'booking/update',{id:booking1.id,version:booking1.version,action:'pay'})).status,400);
 booking1=(await ok(staff1,'booking/update',{id:booking1.id,version:booking1.version,action:'pay',payment_reference:'TEST-EXTERNAL-TRANSFER-123'})).booking;
 assert.equal(booking1.status,'paid');assert.equal(booking1.payment_reference,'TEST-EXTERNAL-TRANSFER-123');
 const detail=await ok(farmer,`booking/${booking1.id}`);assert.deepEqual(detail.events.map(e=>e.status),['booked','checked_in','called','weighing','procured','paid']);assert.deepEqual(detail.events.map(e=>e.version),[0,1,2,3,4,5]);
 assert.equal((await request(farmer,'bookings',{id:crypto.randomUUID(),crop_id:crop1,mandi_id:mandi1,date:'2026-09-15',slot:9})).status,409);
 const next=await ok(staff1,'staff/call-next',{mandi_id:mandi1});assert.equal(next.booking.id,booking2.id);
});
test('cancellation releases capacity; stale cancellation and same-day duplicates do not corrupt events',async()=>{
 const b=sql.prepare("SELECT * FROM bookings WHERE slot=10 AND status='booked' ORDER BY sequence LIMIT 1").get();const u={userId:b.user_id,email:'load@example.test',displayName:'Load'};
 await ok(u,'booking/update',{id:b.id,version:b.version,action:'cancel'});
 assert.equal((await request(u,'booking/update',{id:b.id,version:b.version,action:'cancel'})).status,409);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM events WHERE booking_id=?').get(b.id).n,2);
 const replacement=await ok(u,'bookings',{id:crypto.randomUUID(),crop_id:b.crop_id,mandi_id:mandi1,date:indiaDate(),slot:10},201);assert(replacement.booking.sequence>b.sequence);
});
test('notifications are user-owned, persistent, and can be marked read; profile changes reset verification',async()=>{
 let w=await ok(farmer,'workspace');assert(w.notifications.length>=7);assert(w.bookings.every(b=>b.user_id===farmer.userId));assert(w.crops.every(c=>c.user_id===farmer.userId));
 await ok(farmer,'notifications/read',{});w=await ok(farmer,'workspace');assert(w.notifications.every(n=>n.read_at));
 await ok(farmer,'profile',{...profile,name:'Changed Name',mandi_id:mandi1});assert.equal((await ok(farmer,'session')).user.verified,0);
 const plan=sql.prepare("EXPLAIN QUERY PLAN SELECT * FROM bookings WHERE user_id=? ORDER BY booking_date").all(farmer.userId);assert(plan.some(p=>p.detail.includes('idx_bookings_user_date')));
});
test('unfinished queues carry over midnight without losing farmers or overfilling desks',async()=>{
 const waiting=sql.prepare("SELECT * FROM bookings WHERE slot=10 AND status='booked' LIMIT 1").get();
 await ok(staff1,'booking/update',{id:waiting.id,version:waiting.version,action:'checkin'});
 clock='2026-09-15T02:30:00.000Z';
 const q=await ok({userId:waiting.user_id,email:'test@example.test',displayName:'Test'},`queue?mandi_id=${mandi1}`);
 assert.equal(q.mine.id,waiting.id);assert.equal(q.waiting,1);assert(q.current.some(b=>b.token===booking2.token));
 assert.equal((await request(staff1,'staff/call-next',{mandi_id:mandi1})).status,409);
 let current=(await ok(staff1,`booking/${booking2.id}`)).booking;
 current=(await ok(staff1,'booking/update',{id:current.id,version:current.version,action:'weigh'})).booking;
 await ok(staff1,'booking/update',{id:current.id,version:current.version,action:'procure',weight_kg:500,rate_rupees:25});
 const next=await ok(staff1,'staff/call-next',{mandi_id:mandi1});assert.equal(next.booking.id,waiting.id);
 const q2=await ok(null,`queue?mandi_id=${mandi1}`);assert.equal(q2.current.length,1);assert.equal(q2.current[0].token,waiting.token);
});
test('changing a schedule concurrently with booking cannot admit a token against a stale schedule',async()=>{
 const id=(await ok(owner,'mandis',{...config,name:'Concurrent Test Centre'})).id;
 const c=(await ok(owner,'crops',{name:'Wheat',variety:'',quantity_kg:100,season:'Test'},201)).id;
 const results=await Promise.all([request(owner,'bookings',{id:crypto.randomUUID(),crop_id:c,mandi_id:id,date:indiaDate(),slot:12}),request(owner,'mandis',{...config,id,name:'Concurrent Test Centre',open_hour:13})]);
 assert.equal(results.filter(r=>r.status===409).length,1);
 const m=sql.prepare('SELECT * FROM mandis WHERE id=?').get(id);
 const b=sql.prepare('SELECT * FROM bookings WHERE mandi_id=?').get(id);
 if(b)assert(b.slot>=m.open_hour);
});
test('calendar timezone, distance, estimate, and money calculations use real inputs',()=>{
 assert.equal(indiaDate(new RealDate('2026-09-13T20:00:00Z')),'2026-09-14');
 assert.equal(haversine(23,77,23,77),0);assert(haversine(0,0,0,1)>111&&haversine(0,0,0,1)<112);
 assert.equal(estimateWait(4,2,10,2),30);assert.equal(amountPaise(499.25,2415),1205689);
});
after(()=>{globalThis.Date=RealDate;sql.close();rmSync(dir,{recursive:true,force:true});});
