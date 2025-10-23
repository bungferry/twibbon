// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hruicocxjqpabjlzwyfg.supabase.co' // Ganti dengan URL proyek Anda
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydWljb2N4anFwYWJqbHp3eWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExOTM1MDgsImV4cCI6MjA3Njc2OTUwOH0.KQIKWguGonN36nzhhjaQNBHEL8-gRoH8i4xi2nnkDSg' // Ganti dengan Public Key Anda

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
