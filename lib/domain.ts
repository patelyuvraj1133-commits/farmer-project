export const CROP_NAMES = ["Wheat", "Paddy", "Soybean", "Maize", "Gram", "Mustard", "Bajra", "Jowar", "Tur", "Cotton"] as const;
export const CROP_HINDI:Record<string,string>={Wheat:"गेहूँ",Paddy:"धान",Soybean:"सोयाबीन",Maize:"मक्का",Gram:"चना",Mustard:"सरसों",Bajra:"बाजरा",Jowar:"ज्वार",Tur:"अरहर",Cotton:"कपास"};
export function cropLabel(name:string,hi=false){return hi?(CROP_HINDI[name]||name):name;}
export const STATUS_ORDER = ["booked", "checked_in", "called", "weighing", "procured", "paid"] as const;
export const STATUS_LABELS: Record<string, [string,string]> = {
  booked:["Token booked","टोकन बुक हुआ"],checked_in:["Checked in","प्रवेश दर्ज"],called:["Your turn","आपकी बारी"],
  weighing:["Weighing","तौल जारी"],procured:["Payment pending","भुगतान बाकी"],paid:["Payment recorded","भुगतान दर्ज"],cancelled:["Cancelled","रद्द"],
};
export function indiaDate(now = new Date()) { return new Date(now.getTime()+330*60000).toISOString().slice(0,10); }
export function indiaHour(now = new Date()) { return new Date(now.getTime()+330*60000).getUTCHours(); }
export function addDays(date:string,n:number) { const d=new Date(date+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10); }
export function dateWeekday(date:string) { return new Date(date+"T00:00:00Z").getUTCDay(); }
export function validDate(date:string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)) && new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date; }
export function haversine(a:number,b:number,c:number,d:number) {
 const rad=(n:number)=>n*Math.PI/180;const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
}
export function estimateWait(ahead:number,active:number,minutes:number,desks:number) { return Math.max(0,Math.ceil((ahead+active)/Math.max(1,desks))*minutes); }
export function amountPaise(weightKg:number,ratePaise:number) { return Math.round(weightKg*ratePaise); }
export type Identity={userId:string;email:string;displayName:string;fullName?:string|null};
export type User={id:string;email:string;name:string;phone:string;village:string;role:"farmer"|"staff"|"admin";mandi_id:string|null;verified:number;created_at:string};
export type Mandi={id:string;name:string;district:string;address:string;latitude:number;longitude:number;capacity:number;service_minutes:number;desks:number;open_hour:number;close_hour:number;opening_days:string;accepted_crops:string;active:number;created_at:string};
export type Crop={id:string;user_id:string;name:string;variety:string;quantity_kg:number;season:string;created_at:string};
export type Booking={id:string;token:string;sequence:number;user_id:string;mandi_id:string;crop_id:string;crop_name:string;quantity_kg:number;booking_date:string;slot:number;status:string;weight_kg:number|null;rate_paise:number|null;amount_paise:number|null;payment_reference:string|null;checked_in_at:string|null;called_at:string|null;procured_at:string|null;paid_at:string|null;created_at:string;updated_at:string;version:number;mandi_name?:string;mandi_address?:string;farmer_name?:string;farmer_phone?:string;village?:string;ahead?:number;eta_minutes?:number|null};
