import { createClient } from '@supabase/supabase-js'

// Server/admin client — only use in API routes, never imported by client components
export function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
