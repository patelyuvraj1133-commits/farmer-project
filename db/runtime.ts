import { env } from "cloudflare:workers";
export function runtimeDb(): D1Database { if(!env.DB) throw new Error("Storage unavailable"); return env.DB; }
export function bootstrapEnabled(): boolean { return (env as unknown as Record<string,unknown>).BOOTSTRAP_ADMIN_ENABLED === "true"; }
