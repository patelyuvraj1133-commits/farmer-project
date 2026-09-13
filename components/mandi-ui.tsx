"use client";
import { type ReactNode } from "react";
import { Inbox, LoaderCircle, ArrowRight } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/domain";
export function Picker({label,value,onChange,options,placeholder,disabled,id}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];placeholder?:string;disabled?:boolean;id?:string}){
 const controlId=id||label.toLowerCase().replace(/\s+/g,"-");
 return <div className="field"><label htmlFor={controlId}>{label}</label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={controlId} className="w-full min-h-11 bg-white"><SelectValue placeholder={placeholder||label}/></SelectTrigger><SelectContent position="popper">{options.map(o=><SelectItem value={o.value} key={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
}
export function Field({label,id,children,hint}:{label:string;id:string;children:ReactNode;hint?:string}) {return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint&&<small>{hint}</small>}</div>;}
export function EmptyState({title,description,action,icon}:{title:string;description:string;action?:ReactNode;icon?:ReactNode}) {return <Empty className="empty-state"><EmptyHeader><EmptyMedia variant="icon">{icon||<Inbox/>}</EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{action&&<EmptyContent>{action}</EmptyContent>}</Empty>;}
export function Status({status,hi=false}:{status:string;hi?:boolean}) {return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]?.[hi?1:0]||status}</span>;}
export function Submit({busy,children}:{busy:boolean;children:ReactNode}) {return <button className="primary-button" type="submit" disabled={busy}>{busy?<LoaderCircle size={17} className="animate-spin"/>:null}{children}{!busy&&<ArrowRight size={17}/>}</button>;}
export function SectionTitle({eyebrow,title,action}:{eyebrow?:string;title:string;action?:ReactNode}) {return <div className="panel-heading"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>;}
export type T=(en:string,hi:string)=>string;
