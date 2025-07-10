import { createClient } from '@supabase/supabase-js'

// For development, you can hardcode these values or use environment variables
const supabaseUrl = 'https://wzldancmqjisruttfrqh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bGRhbmNtcWppc3J1dHRmcnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMTgyMDgsImV4cCI6MjA2NzU5NDIwOH0.UIQrfyiSHNW7U52q1S2LBvtt0RYPbVRNOxs8Tky-1Zo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
