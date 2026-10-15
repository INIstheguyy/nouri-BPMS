import { publicEnv } from '../env'

export async function checkSupabaseConnectivity(): Promise<void> {
  const response = await fetch(`${publicEnv.VITE_SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: publicEnv.VITE_SUPABASE_ANON_KEY },
  })

  if (!response.ok) {
    throw new Error('Supabase is not reachable. Check the URL, key, and local stack.')
  }
}
