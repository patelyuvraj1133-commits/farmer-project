export async function api<T=any>(path:string,data?:unknown):Promise<T> {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try {
  const response=await fetch("/api/"+path,{method:data===undefined?"GET":"POST",headers:data===undefined?{}:{"Content-Type":"application/json","X-MandiMitra-Client":"web"},body:data===undefined?undefined:JSON.stringify(data),cache:"no-store",signal:controller.signal});
  const result:any=await response.json().catch(()=>({error:"The service returned an unexpected response. Please retry."}));
  if(!response.ok)throw new Error(result.error||"Unable to complete the request.");return result as T;
 }catch(error){if(error instanceof Error&&error.name==="AbortError")throw new Error("The connection is slow. Check your connection and try again.");throw error;}finally{clearTimeout(timer);}
}
export function formatDate(date:string,hi=false) {return new Date(date+"T12:00:00+05:30").toLocaleDateString(hi?"hi-IN":"en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});}
export function formatTime(hour:number) {return `${hour%12||12}:00 ${hour<12?"AM":"PM"}`;}
export function currency(paise:number|null|undefined) {return paise==null?"—":new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(paise/100);}
