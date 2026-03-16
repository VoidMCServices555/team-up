// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          discriminator: string
          display_name: string
          avatar_url: string | null
          avatar_color: string
          banner_url: string | null
          banner_color: string | null
          about_me: string | null
          custom_status: string | null
          status: 'online' | 'idle' | 'dnd' | 'offline'
          phone: string | null
          created_at: string
          updated_at: string
        }
      }
      servers: {
        Row: {
          id: string
          name: string
          icon_url: string | null
          owner_id: string
          created_at: string
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string | null
          dm_channel_id: string | null
          author_id: string
          content: string
          edited_at: string | null
          created_at: string
        }
      }
    }
  }
}
