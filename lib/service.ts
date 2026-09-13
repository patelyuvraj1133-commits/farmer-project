import { z } from "zod";
import { CROP_NAMES, indiaDate, indiaHour, addDays, validDate, dateWeekday, estimateWait, amountPaise } from "./domain";
import type { Identity, User, Mandi, Booking, Crop } from "./domain";

type Row = Record<string, any>;
class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
const fail=(status:number,message:string):never=>{throw new ApiError(status,message);};
const stmt=(db:D1Database,sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
async function all<T=Row>(db:D1Database,sql:string,...args:unknown[]):Promise<T[]> { return (await stmt(db,sql,...args).all<T>()).results; }
async function one<T=Row>(db:D1Database,sql:string,...args:unknown[]):Promise<T|null> { return stmt(db,sql,...args).first<T>(); }
const uid=()=>crypto.randomUUID();
const iso=()=>new Date().toISOString();
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const string=(min:number,max:number)=>z.string().trim().min(min).max(max);
const optionalId=z.string().uuid().nullable().optional();
const number=(min:number,max:number)=>z.number().finite().min(min).max(max);
const profileSchema=z.object({name:string(2,80),phone:z.string().regex(/^[6-9]\d{9}$/, "Use a valid 10-digit Indian mobile number"),village:string(2,100),mandi_id:optionalId});
const cropSchema=z.object({name:z.enum(CROP_NAMES),variety:string(0,60).default(""),quantity_kg:number(1,100000),season:string(2,40)});
const mandiSchema=z.object({id:optionalId,name:string(3,100),district:string(2,80),address:string(5,240),latitude:number(-90,90),longitude:number(-180,180),capacity:number(1,100).int(),service_minutes:number(2,120).int(),desks:number(1,20).int(),open_hour:number(0,22).int(),close_hour:number(1,23).int(),opening_days:z.array(number(0,6).int()).min(1).max(7),accepted_crops:z.array(z.enum(CROP_NAMES)).min(1).max(10),active:z.boolean().default(true)}).refine(x=>x.close_hour>x.open_hour,{message:"Closing time must be after opening time"});
const bookingSchema=z.object({id:z.string().uuid(),crop_id:z.string().uuid(),mandi_id:z.string().uuid(),date:string(10,10).refine(validDate,"Choose a valid date"),slot:number(0,23).int()});
async function payload(request:Request) { const text=await request.text(); if(text.length>16000) fail(413,"This request is too large."); try{return JSON.parse(text);}catch{fail(400,"Send a valid request.");} }
async function actor(db:D1Database,identity:Identity|null):Promise<User> { if(!identity)fail(401,"Sign in to continue.");const u=await one<User>(db,"SELECT * FROM users WHERE id = ?",identity!.userId); if(!u)fail(403,"Complete your profile first.");return u!; }
function staff(u:User) { if(!["admin","staff"].includes(u.role))fail(403,"Staff access is required."); }
function admin(u:User) { if(u.role!=="admin")fail(403,"Administrator access is required."); }
function manage(u:User,mandiId:string) {staff(u);if(u.role!=="admin" && u.mandi_id!==mandiId)fail(403,"You can only manage your assigned mandi.");}
function dayQuery(url:URL) {const date=url.searchParams.get("date")||indiaDate();if(!validDate(date))fail(400,"Choose a valid date.");return date;}

async function marketData(db:D1Database) {
 const today=indiaDate();
 const [mandis,counts,history,queue]=await Promise.all([
   all<Mandi>(db,"SELECT * FROM mandis WHERE active=1 ORDER BY name LIMIT 200"),
   all(db,"SELECT mandi_id, booking_date, slot, COUNT(*) AS booked FROM bookings WHERE booking_date BETWEEN ? AND ? AND status <> 'cancelled' GROUP BY mandi_id,booking_date,slot",today,addDays(today,13)),
   all(db,"SELECT mandi_id, booking_date, COUNT(*) AS arrivals FROM bookings WHERE booking_date >= ? AND booking_date < ? AND status <> 'cancelled' GROUP BY mandi_id,booking_date",addDays(today,-56),today),
   all(db,"SELECT mandi_id, status, COUNT(*) AS count FROM bookings WHERE booking_date=? GROUP BY mandi_id,status",today),
 ]);
 return {mandis,counts,history,queue,today,hour:indiaHour(),updated_at:iso()};
}
async function queueData(db:D1Database,mandiId:string,userId?:string) {
 const m=await one<Mandi>(db,"SELECT * FROM mandis WHERE id=?",mandiId);if(!m)fail(404,"Mandi not found.");const today=indiaDate();
 const [counts,current,waiting,mine,durations]=await Promise.all([
   all(db,"SELECT status, COUNT(*) AS count FROM bookings WHERE mandi_id=? AND ((booking_date<=? AND status IN ('checked_in','called','weighing')) OR (booking_date=? AND status='booked') OR (status IN ('procured','paid') AND date(procured_at,'+330 minutes')=?)) GROUP BY status",mandiId,today,today,today),
   all(db,"SELECT token, status, slot FROM bookings WHERE mandi_id=? AND booking_date<=? AND status IN ('called','weighing') ORDER BY called_at",mandiId,today),
   all(db,"SELECT id,slot,sequence FROM bookings WHERE mandi_id=? AND booking_date<=? AND status='checked_in' ORDER BY booking_date,slot,sequence",mandiId,today),
   userId?all<Booking>(db,"SELECT * FROM bookings WHERE mandi_id=? AND user_id=? AND status <> 'cancelled' AND (booking_date=? OR (booking_date<? AND status IN ('checked_in','called','weighing'))) ORDER BY booking_date,sequence",mandiId,userId,today,today):Promise.resolve([] as Booking[]),
   all(db,"SELECT (julianday(procured_at)-julianday(called_at))*1440 AS minutes FROM bookings WHERE mandi_id=? AND procured_at IS NOT NULL AND called_at IS NOT NULL AND procured_at >= ? ORDER BY procured_at DESC LIMIT 30",mandiId,addDays(today,-14)),
 ]);
 const sample=durations.map(x=>x.minutes).filter(n=>Number.isFinite(n)&&n>=1&&n<=240);const minutes=sample.length>=5?Math.round(sample.reduce((a,b)=>a+b,0)/sample.length):m!.service_minutes;
 const booking=mine[0];const ahead=booking?.status==="checked_in"?waiting.findIndex(x=>x.id===booking.id):null;
 return {mandi:m,counts,current,waiting:waiting.length,service_minutes:minutes,estimate_basis:sample.length>=5?"observed":"configured",sample_count:sample.length,mine:booking||null,ahead,eta_minutes:ahead!==null&&ahead>=0?estimateWait(ahead,current.length,minutes,m!.desks):null,updated_at:iso()};
}
async function getRoute(db:D1Database,identity:Identity|null,url:URL,path:string) {
 if(path==="health") {await one(db,"SELECT 1 AS ok");return json({ok:true,storage:"connected",timestamp:iso()});}
 if(path==="markets")return json(await marketData(db));
 if(path==="session") {const user=identity?await one<User>(db,"SELECT * FROM users WHERE id=?",identity.userId):null;return json({identity:identity?{displayName:identity.displayName,email:identity.email}:null,user});}
 if(path==="queue") {const id=url.searchParams.get("mandi_id");if(!id||!z.string().uuid().safeParse(id).success)fail(400,"Choose a mandi.");return json(await queueData(db,id!,identity?.userId));}
 const u=await actor(db,identity);
 if(path==="workspace") {
  const [crops,bookings,notifications]=await Promise.all([
    all<Crop>(db,"SELECT * FROM crops WHERE user_id=? ORDER BY created_at DESC LIMIT 200",u.id),
    all<Booking>(db,"SELECT b.*,m.name AS mandi_name,m.address AS mandi_address FROM bookings b JOIN mandis m ON m.id=b.mandi_id WHERE b.user_id=? ORDER BY b.booking_date DESC,b.created_at DESC LIMIT 200",u.id),
    all(db,"SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",u.id),
  ]);return json({user:u,crops,bookings,notifications});
 }
 if(path.startsWith("booking/")) {
  const id=path.slice(8);const b=await one<Booking>(db,"SELECT b.*,m.name AS mandi_name,m.address AS mandi_address,u.name AS farmer_name,u.phone AS farmer_phone,u.village FROM bookings b JOIN mandis m ON m.id=b.mandi_id JOIN users u ON u.id=b.user_id WHERE b.id=?",id);
  if(!b)fail(404,"Booking not found.");if(b!.user_id!==u.id)manage(u,b!.mandi_id);
  return json({booking:b,events:await all(db,"SELECT status,note,created_at,version FROM events WHERE booking_id=? ORDER BY version",id)});
 }
 if(path==="staff") {
  staff(u);const date=dayQuery(url);const mandiId=u.role==="staff"?u.mandi_id:url.searchParams.get("mandi_id");
  const page=Math.max(0,Math.min(10000,Number(url.searchParams.get("page"))||0));
  const where=mandiId?"b.booking_date=? AND b.mandi_id=?":"b.booking_date=?";const args=mandiId?[date,mandiId]:[date];
  const [bookings,summary,mandis]=await Promise.all([
   all(db,`SELECT b.*,m.name AS mandi_name,u.name AS farmer_name,u.phone AS farmer_phone,u.village FROM bookings b JOIN users u ON u.id=b.user_id JOIN mandis m ON m.id=b.mandi_id WHERE ${where} ORDER BY b.slot,b.sequence LIMIT 50 OFFSET ?`,...args,Math.floor(page)*50),
   all(db,`SELECT b.status,COUNT(*) AS count,COALESCE(SUM(b.weight_kg),0) AS weight,COALESCE(SUM(b.amount_paise),0) AS amount FROM bookings b WHERE ${where} GROUP BY b.status`,...args),
   u.role==="admin"?all(db,"SELECT * FROM mandis ORDER BY name LIMIT 200"):all(db,"SELECT * FROM mandis WHERE id=?",u.mandi_id),
  ]);return json({bookings,summary,mandis,date,page});
 }
 if(path==="staff/users") {
  staff(u);const search=(url.searchParams.get("q")||"").slice(0,80).replace(/[\\%_]/g,"\\$&");const page=Math.max(0,Math.min(10000,Number(url.searchParams.get("page"))||0));
  const where=u.role==="admin"?"1=1":"u.mandi_id=? AND u.role='farmer'";const args=u.role==="admin"?[]:[u.mandi_id];
  const rows=await all(db,`SELECT u.*,m.name AS mandi_name FROM users u LEFT JOIN mandis m ON u.mandi_id=m.id WHERE ${where} AND (u.name LIKE ? ESCAPE '\\' OR u.phone LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\') ORDER BY u.verified,u.created_at DESC LIMIT 50 OFFSET ?`,...args,`%${search}%`,`%${search}%`,`%${search}%`,Math.floor(page)*50);
  return json({users:rows,page});
 }
 return fail(404,"This page was not found.");
}

async function addEvent(db:D1Database,b:Booking,u:User,status:string,note:string,patch:Record<string,unknown>={}) {
 const now=iso();const eventId=uid();const version=b.version+1;
 const cols=Object.keys(patch);const allowed=["weight_kg","rate_paise","amount_paise","payment_reference","checked_in_at","called_at","procured_at","paid_at"];
 if(cols.some(k=>!allowed.includes(k)))throw new Error("Unexpected update field");
 const extra=cols.map(k=>`,${k}=?`).join("");
 const result=await db.batch([
  stmt(db,`UPDATE bookings SET status=?,version=?,updated_at=?${extra} WHERE id=? AND version=? AND status=?`,status,version,now,...Object.values(patch),b.id,b.version,b.status),
  stmt(db,"INSERT INTO events (id,booking_id,actor_id,status,note,version,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1",eventId,b.id,u.id,status,note,version,now),
  stmt(db,"INSERT INTO notifications (id,user_id,booking_id,status,message,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM events WHERE id=?)",uid(),b.user_id,b.id,status,note,now,eventId),
 ]);
 if(!result[0].meta.changes)fail(409,"This token changed. Refresh and try again.");
 return one<Booking>(db,"SELECT * FROM bookings WHERE id=?",b.id);
}

async function postRoute(db:D1Database,identity:Identity|null,request:Request,path:string,bootstrap:boolean) {
 if(!identity)fail(401,"Sign in to continue.");const raw=await payload(request);
 if(path==="profile") {
  const p=profileSchema.parse(raw);const existing=await one<User>(db,"SELECT * FROM users WHERE id=?",identity!.userId);
  if(p.mandi_id && !await one(db,"SELECT id FROM mandis WHERE id=?",p.mandi_id))fail(400,"Choose an available mandi.");
  if(existing) {
   const changed=p.name!==existing.name||p.phone!==existing.phone||p.village!==existing.village;
   await stmt(db,"UPDATE users SET name=?,phone=?,village=?,mandi_id=?,verified=? WHERE id=?",p.name,p.phone,p.village,existing.role==="farmer"?(p.mandi_id||null):existing.mandi_id,changed&&existing.role==="farmer"?0:existing.verified,existing.id).run();
  } else {
   await stmt(db,"INSERT INTO users (id,email,name,phone,village,mandi_id,role,verified,created_at) SELECT ?,?,?,?,?,?,CASE WHEN ?=1 AND NOT EXISTS(SELECT 1 FROM users) THEN 'admin' ELSE 'farmer' END,CASE WHEN ?=1 AND NOT EXISTS(SELECT 1 FROM users) THEN 1 ELSE 0 END,? ON CONFLICT(id) DO NOTHING",identity!.userId,identity!.email,p.name,p.phone,p.village,p.mandi_id||null,bootstrap?1:0,bootstrap?1:0,iso()).run();
  }return json({user:await one(db,"SELECT * FROM users WHERE id=?",identity!.userId)});
 }
 const u=await actor(db,identity);
 if(path==="crops") {
  const p=cropSchema.parse(raw);const count=await one(db,"SELECT COUNT(*) AS n FROM crops WHERE user_id=?",u.id);if(count!.n>=200)fail(409,"You have reached 200 crop registrations. Contact your mandi staff.");
  const id=uid();await stmt(db,"INSERT INTO crops (id,user_id,name,variety,quantity_kg,season,created_at) VALUES (?,?,?,?,?,?,?)",id,u.id,p.name,p.variety,p.quantity_kg,p.season,iso()).run();return json({id},201);
 }
 if(path==="mandis") {
  admin(u);const p=mandiSchema.parse(raw);const id=p.id||uid();const exists=await one<Mandi>(db,"SELECT * FROM mandis WHERE id=?",id);
  if(exists) {
   const future=await one(db,"SELECT COUNT(*) AS n FROM bookings WHERE mandi_id=? AND booking_date>=? AND status IN ('booked','checked_in','called','weighing')",id,indiaDate());
   const scheduleChanged=p.capacity!==exists.capacity||p.open_hour!==exists.open_hour||p.close_hour!==exists.close_hour||JSON.stringify([...p.opening_days].sort())!==JSON.stringify(JSON.parse(exists.opening_days).sort())||JSON.stringify([...p.accepted_crops].sort())!==JSON.stringify(JSON.parse(exists.accepted_crops).sort());
   if(future!.n>0 && scheduleChanged)fail(409,"This mandi has active bookings. Complete or cancel them before changing its hours, capacity, days, or crops.");
   const active=await one(db,"SELECT COUNT(*) AS n FROM bookings WHERE mandi_id=? AND booking_date=? AND status IN ('called','weighing')",id,indiaDate());
   if(p.desks<active!.n)fail(409,"Finish the active weighing desks before reducing their number.");
   const saved=await stmt(db,"UPDATE mandis SET name=?,district=?,address=?,latitude=?,longitude=?,capacity=?,service_minutes=?,desks=?,open_hour=?,close_hour=?,opening_days=?,accepted_crops=?,active=? WHERE id=? AND (?=0 OR NOT EXISTS(SELECT 1 FROM bookings WHERE mandi_id=? AND booking_date>=? AND status IN ('booked','checked_in','called','weighing'))) AND ?>=(SELECT COUNT(*) FROM bookings WHERE mandi_id=? AND status IN ('called','weighing'))",p.name,p.district,p.address,p.latitude,p.longitude,p.capacity,p.service_minutes,p.desks,p.open_hour,p.close_hour,JSON.stringify([...new Set(p.opening_days)].sort()),JSON.stringify([...new Set(p.accepted_crops)]),p.active?1:0,id,scheduleChanged?1:0,id,indiaDate(),p.desks,id).run();
   if(!saved.meta.changes)fail(409,"Bookings or active desks changed while saving. Refresh and try again.");
  } else await stmt(db,"INSERT INTO mandis (id,name,district,address,latitude,longitude,capacity,service_minutes,desks,open_hour,close_hour,opening_days,accepted_crops,active,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",id,p.name,p.district,p.address,p.latitude,p.longitude,p.capacity,p.service_minutes,p.desks,p.open_hour,p.close_hour,JSON.stringify([...new Set(p.opening_days)].sort()),JSON.stringify([...new Set(p.accepted_crops)]),p.active?1:0,iso()).run();
  return json({id});
 }
 if(path==="bookings") {
  const p=bookingSchema.parse(raw);const existing=await one<Booking>(db,"SELECT * FROM bookings WHERE id=?",p.id);if(existing){if(existing.user_id!==u.id)fail(409,"Please try again.");return json({booking:existing});}
  if(!u.verified)fail(403,"Your mandi staff must verify your profile before you can book.");
  const [m,c]=await Promise.all([one<Mandi>(db,"SELECT * FROM mandis WHERE id=? AND active=1",p.mandi_id),one<Crop>(db,"SELECT * FROM crops WHERE id=? AND user_id=?",p.crop_id,u.id)]);
  if(!m)fail(404,"This mandi is not accepting bookings.");if(!c)fail(404,"Choose one of your registered crops.");
  const today=indiaDate();if(p.date<today||p.date>addDays(today,13))fail(400,"Bookings are available for the next 14 days.");
  if(!JSON.parse(m!.opening_days).includes(dateWeekday(p.date)))fail(409,"This mandi is closed on the selected day.");
  if(p.slot<m!.open_hour||p.slot>=m!.close_hour||p.date===today&&p.slot<=indiaHour())fail(409,"Choose a future available time slot.");
  if(!JSON.parse(m!.accepted_crops).includes(c!.name))fail(409,"This mandi does not accept that crop.");
  const token="MM-"+crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();const now=iso();const eventId=uid();
  const res=await db.batch([
   stmt(db,`INSERT INTO bookings (id,token,sequence,user_id,mandi_id,crop_id,crop_name,quantity_kg,booking_date,slot,status,created_at,updated_at,version)
    SELECT ?,?,COALESCE((SELECT MAX(sequence) FROM bookings WHERE mandi_id=? AND booking_date=?),0)+1,?,?,?,?,?,?,?,'booked',?,?,0
    WHERE (SELECT COUNT(*) FROM bookings WHERE mandi_id=? AND booking_date=? AND slot=? AND status<>'cancelled') < (SELECT capacity FROM mandis WHERE id=? AND active=1)
    AND EXISTS(SELECT 1 FROM users WHERE id=? AND verified=1)
    AND NOT EXISTS(SELECT 1 FROM bookings WHERE user_id=? AND booking_date=? AND status<>'cancelled')
    AND NOT EXISTS(SELECT 1 FROM bookings WHERE crop_id=? AND status<>'cancelled')
    AND EXISTS(SELECT 1 FROM mandis WHERE id=? AND open_hour=? AND close_hour=? AND opening_days=? AND accepted_crops=?)`,p.id,token,m!.id,p.date,u.id,m!.id,c!.id,c!.name,c!.quantity_kg,p.date,p.slot,now,now,m!.id,p.date,p.slot,m!.id,u.id,u.id,p.date,c!.id,m!.id,m!.open_hour,m!.close_hour,m!.opening_days,m!.accepted_crops),
   stmt(db,"INSERT INTO events (id,booking_id,actor_id,status,note,version,created_at) SELECT ?,?,?,'booked','Your procurement slot is confirmed.',0,? WHERE changes()=1",eventId,p.id,u.id,now),
   stmt(db,"INSERT INTO notifications (id,user_id,booking_id,status,message,created_at) SELECT ?,?,?,'booked','Your procurement slot is confirmed.',? WHERE EXISTS(SELECT 1 FROM events WHERE id=?)",uid(),u.id,p.id,now,eventId),
  ]);
  if(!res[0].meta.changes)fail(409,"The slot is full, you already have a booking that day, or this crop has an active token. Refresh and choose another slot.");
  return json({booking:await one(db,"SELECT * FROM bookings WHERE id=?",p.id)},201);
 }
 if(path==="notifications/read") {await stmt(db,"UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",iso(),u.id).run();return json({ok:true});}
 if(path==="staff/verify") {
  staff(u);const p=z.object({user_id:string(1,200),verified:z.boolean()}).parse(raw);const target=await one<User>(db,"SELECT * FROM users WHERE id=?",p.user_id);if(!target)fail(404,"Farmer not found.");
  if(target!.role!=="farmer")fail(409,"Only farmer profiles can be verified here.");if(u.role!=="admin"&&u.mandi_id!==target!.mandi_id)fail(403,"This farmer is registered at another mandi.");
  await db.batch([stmt(db,"UPDATE users SET verified=? WHERE id=?",p.verified?1:0,target!.id),stmt(db,"INSERT INTO notifications (id,user_id,status,message,created_at) VALUES (?,?,?,?,?)",uid(),target!.id,p.verified?"verified":"verification_pending",p.verified?"Your mandi has verified your profile. You can now book a token.":"Your profile requires verification. Contact your mandi staff.",iso())]);return json({ok:true});
 }
 if(path==="staff/role") {
  admin(u);const p=z.object({user_id:string(1,200),role:z.enum(["farmer","staff"]),mandi_id:optionalId}).parse(raw);if(p.user_id===u.id)fail(409,"The administrator role cannot be changed here.");
  if(p.role==="staff"&&!p.mandi_id)fail(400,"Assign a mandi to this staff member.");if(p.mandi_id&&!await one(db,"SELECT id FROM mandis WHERE id=?",p.mandi_id))fail(404,"Mandi not found.");
  const changed=await stmt(db,"UPDATE users SET role=?,mandi_id=? WHERE id=? AND role<>'admin'",p.role,p.mandi_id||null,p.user_id).run();if(!changed.meta.changes)fail(404,"Account not found.");return json({ok:true});
 }
 if(path==="staff/call-next") {
  const p=z.object({mandi_id:z.string().uuid()}).parse(raw);manage(u,p.mandi_id);const now=iso();const today=indiaDate();
  const m=await one<Mandi>(db,"SELECT * FROM mandis WHERE id=?",p.mandi_id);if(!m)fail(404,"Mandi not found.");
  const eventId=uid();
  const result=await db.batch([
   stmt(db,`UPDATE bookings SET status='called',called_at=?,updated_at=?,operation_id=?,version=version+1 WHERE id=(SELECT id FROM bookings WHERE mandi_id=? AND booking_date<=? AND status='checked_in' ORDER BY booking_date,slot,sequence LIMIT 1) AND status='checked_in' AND (SELECT COUNT(*) FROM bookings WHERE mandi_id=? AND booking_date<=? AND status IN ('called','weighing')) < (SELECT desks FROM mandis WHERE id=?) RETURNING *`,now,now,eventId,p.mandi_id,today,p.mandi_id,today,p.mandi_id),
   stmt(db,`INSERT INTO events (id,booking_id,actor_id,status,note,version,created_at) SELECT ?,id,?,'called','Please proceed to the weighing desk.',version,? FROM bookings WHERE operation_id=? AND status='called' AND changes()=1`,eventId,u.id,now,eventId),
   stmt(db,"INSERT INTO notifications (id,user_id,booking_id,status,message,created_at) SELECT ?,b.user_id,b.id,'called','Please proceed to the weighing desk.',? FROM bookings b JOIN events e ON e.booking_id=b.id WHERE e.id=?",uid(),now,eventId),
  ]);
  if(!result[0].meta.changes)fail(409,"No checked-in farmers are waiting, or all weighing desks are occupied.");return json({booking:result[0].results[0]});
 }
 if(path==="booking/update") {
  const p=z.object({id:z.string().uuid(),version:number(0,1000000).int(),action:z.enum(["checkin","weigh","procure","pay","cancel"]),weight_kg:number(.01,100000).optional(),rate_rupees:number(.01,100000).optional(),payment_reference:string(4,120).optional(),note:string(3,240).optional()}).parse(raw);
  const b=await one<Booking>(db,"SELECT * FROM bookings WHERE id=?",p.id);if(!b)fail(404,"Token not found.");if(b!.version!==p.version)fail(409,"This token changed. Refresh before updating it.");
  if(p.action==="cancel") {
   if(b!.user_id!==u.id)manage(u,b!.mandi_id);if(b!.status!=="booked")fail(409,"Only tokens that have not checked in can be cancelled.");
   return json({booking:await addEvent(db,b!,u,"cancelled",p.note||"Booking cancelled.")});
  }
  manage(u,b!.mandi_id);
  if(p.action==="checkin") {if(b!.status!=="booked")fail(409,"This token has already checked in or is closed.");if(b!.booking_date!==indiaDate())fail(409,"Check-in is only available on the booking date.");return json({booking:await addEvent(db,b!,u,"checked_in","Your arrival has been confirmed.",{checked_in_at:iso()})});}
  if(p.action==="weigh") {if(b!.status!=="called")fail(409,"Call this token before starting weighing.");return json({booking:await addEvent(db,b!,u,"weighing","Your crop is being weighed.")});}
  if(p.action==="procure") {if(b!.status!=="weighing")fail(409,"Start weighing before recording procurement.");if(p.weight_kg===undefined||p.rate_rupees===undefined)fail(400,"Enter the accepted weight and agreed rate.");const rate=Math.round(p.rate_rupees!*100);return json({booking:await addEvent(db,b!,u,"procured",p.note||"Procurement accepted. Payment is pending.",{weight_kg:p.weight_kg!,rate_paise:rate,amount_paise:amountPaise(p.weight_kg!,rate),procured_at:iso()})});}
  if(p.action==="pay") {if(b!.status!=="procured")fail(409,"Record procurement before recording payment.");if(!p.payment_reference)fail(400,"Enter the actual bank or payment reference.");return json({booking:await addEvent(db,b!,u,"paid","Mandi staff recorded an external payment. Check your bank account.",{payment_reference:p.payment_reference!,paid_at:iso()})});}
 }
 return fail(404,"This action was not found.");
}

export async function handleApi(db:D1Database,identity:Identity|null,request:Request,bootstrap=false):Promise<Response> {
 try {
  const url=new URL(request.url);const path=url.pathname.replace(/^\/api\//,"").replace(/\/$/,"");
  if(request.method==="GET")return await getRoute(db,identity,url,path);
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  const origin=request.headers.get("origin");
  if(request.headers.get("x-mandimitra-client")!=="web"||request.headers.get("sec-fetch-site")==="cross-site"||origin&&origin!==url.origin)fail(403,"Please submit this action from MandiMitra.");
  if(!request.headers.get("content-type")?.includes("application/json"))fail(415,"Send JSON content.");
  return await postRoute(db,identity,request,path,bootstrap);
 } catch(error) {
  if(error instanceof ApiError)return json({error:error.message},error.status);
  if(error instanceof z.ZodError)return json({error:error.issues[0]?.message||"Check the details and try again."},400);
  console.error("MandiMitra request failed",error instanceof Error?error.message:"Unknown error");
  if(error instanceof Error&&/UNIQUE constraint/i.test(error.message))return json({error:"This record already exists or the token was just booked. Refresh before trying again."},409);
  return json({error:"The service is temporarily unavailable. Your input is preserved; please try again."},503);
 }
}
