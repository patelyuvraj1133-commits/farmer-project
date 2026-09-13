"use client";
import { createContext,useContext,useState,useEffect,useCallback,useRef,type ReactNode } from "react";
import { useRouter,usePathname } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { User,Mandi,Crop,Booking } from "@/lib/domain";
import type { T } from "@/components/mandi-ui";
type Market={mandis:Mandi[];counts:any[];history:any[];queue:any[];today:string;hour:number;updated_at:string};
type Workspace={crops:Crop[];bookings:Booking[];notifications:any[]};
type AppContext={hi:boolean;t:T;setHi:(v:boolean)=>void;lowData:boolean;setLowData:(v:boolean)=>void;user:User|null;identity:any;market:Market;data:Workspace;loading:boolean;error:string;load:()=>Promise<void>;go:(v:string)=>void;view:string;mutate:(path:string,data:unknown,message?:string)=>Promise<any>;openBooking:(id:string)=>void;detailId:string|null;setDetailId:(id:string|null)=>void};
const Context=createContext<AppContext|null>(null);
export function useMandi(){const c=useContext(Context);if(!c)throw new Error("Missing MandiMitra context");return c;}
export function MandiProvider({children}:{children:ReactNode}) {
 const router=useRouter();const path=usePathname();const view=path?.split("/")[1]||"overview";
 const [hi,setHi]=useState(false);const [lowData,setLowData]=useState(false);const [identity,setIdentity]=useState<any>(null);const [user,setUser]=useState<User|null>(null);
 const [market,setMarket]=useState<Market>({mandis:[],counts:[],history:[],queue:[],today:"",hour:0,updated_at:""});
 const [data,setData]=useState<Workspace>({crops:[],bookings:[],notifications:[]});const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [detailId,setDetailId]=useState<string|null>(null);const fetching=useRef(false);
 const load=useCallback(async()=>{if(fetching.current)return;fetching.current=true;try{const [s,m]=await Promise.all([api("session"),api("markets")]);setIdentity(s.identity);setUser(s.user);setMarket(m);if(s.user){const w=await api("workspace");setData(w);setUser(w.user);}else setData({crops:[],bookings:[],notifications:[]});setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to load the latest records.");}finally{fetching.current=false;setLoading(false);}},[]);
 useEffect(()=>{try{setHi(localStorage.getItem("mandimitra-language")==="hi");setLowData(localStorage.getItem("mandimitra-low-data")==="1");}catch{}void load();},[load]);
 useEffect(()=>{document.documentElement.lang=hi?"hi":"en";try{localStorage.setItem("mandimitra-language",hi?"hi":"en");localStorage.setItem("mandimitra-low-data",lowData?"1":"0");}catch{}},[hi,lowData]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")void load();};const timer=setInterval(refresh,lowData?60000:15000);window.addEventListener("online",refresh);document.addEventListener("visibilitychange",refresh);return()=>{clearInterval(timer);window.removeEventListener("online",refresh);document.removeEventListener("visibilitychange",refresh);};},[load,lowData]);
 const t:T=(en,hiText)=>hi?hiText:en;
 const mutate=async(path:string,payload:unknown,message?:string)=>{const result=await api(path,payload);await load();if(message)toast.success(message);return result;};
 const go=(v:string)=>router.push(v==="overview"?"/":"/"+v);
 const displayed=useRef({data,user});displayed.current={data,user};
 useEffect(()=>{
  const ctx=(document as unknown as {modelContext?:{registerTool:(tool:any,options:any)=>void|Promise<void>}}).modelContext;if(!ctx?.registerTool)return;
  const life=new AbortController();
  Promise.resolve(ctx.registerTool({name:"read_my_procurement_records",title:"Read my procurement records",description:"Read the signed-in farmer’s currently displayed bookings and crop lots. This does not create, cancel, or change a booking.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input:unknown){if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length)throw new Error("Expected an empty object");if(!displayed.current.user)throw new Error("Sign in and complete your profile first");return {bookings:displayed.current.data.bookings.map(b=>({id:b.id,token:b.token,crop:b.crop_name,mandi:b.mandi_name,date:b.booking_date,slot:b.slot,status:b.status,amount_paise:b.amount_paise})),crops:displayed.current.data.crops.map(c=>({id:c.id,name:c.name,quantity_kg:c.quantity_kg,season:c.season}))};}},{signal:life.signal})).catch(()=>{});
  return()=>life.abort();
 },[router]);
 return <Context.Provider value={{hi,t,setHi,lowData,setLowData,user,identity,market,data,loading,error,load,go,view,mutate,openBooking:setDetailId,detailId,setDetailId}}>{children}</Context.Provider>;
}
