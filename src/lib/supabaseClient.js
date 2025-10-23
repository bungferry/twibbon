// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL' // Ganti dengan URL proyek Anda
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY' // Ganti dengan Public Key Anda

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
