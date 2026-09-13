import { notFound } from "next/navigation";
import MandiApp from "../mandi-app";
export const dynamic = "force-dynamic";
const views=["book","queue","bookings","notifications","crops","profile","staff","mandis","people","about"];
export default async function View({params}:{params:Promise<{view:string}>}) {const {view}=await params;if(!views.includes(view))notFound();return <MandiApp/>;}
