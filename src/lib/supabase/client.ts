import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../types/database'
import { publicEnv } from '../env'

export const supabase = createClient<Database>(
  publicEnv.VITE_SUPABASE_URL,
  publicEnv.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
