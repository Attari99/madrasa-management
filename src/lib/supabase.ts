import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://apmeibeuhbpreelidoyw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbWVpYmV1aGJwcmVlbGlkb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA2MzcsImV4cCI6MjA5MTgzNjYzN30.cP3GcCY43kG8hwYjV6hWNxf1KD2pJ4DvU-iDO6_16Os';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = true;