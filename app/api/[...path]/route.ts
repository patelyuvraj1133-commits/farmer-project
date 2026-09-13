import { getChatGPTUser } from "@/app/chatgpt-auth";
import { runtimeDb, bootstrapEnabled } from "@/db/runtime";
import { handleApi } from "@/lib/service";
export const dynamic = "force-dynamic";
async function route(request:Request) {
 try { return await handleApi(runtimeDb(),await getChatGPTUser(),request,bootstrapEnabled()); }
 catch(error) { console.error("MandiMitra storage unavailable",error instanceof Error?error.message:"unknown");return Response.json({error:"MandiMitra is temporarily unavailable. Please try again."},{status:503,headers:{"Cache-Control":"no-store"}}); }
}
export const GET=route;
export const POST=route;
