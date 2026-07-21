import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://esjqybxzpqtonkcomdtb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanF5Ynh6cHF0b25rY29tZHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTE2NTgsImV4cCI6MjA5OTcyNzY1OH0.DEGP5xyOsdl41qFiFaoZfophSKiWdXIcKmq7_wv9nbg';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL)
  .trim()
  .replace(/\/rest\/v1\/?$/, '');

const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.'
  : '';

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'x-client-info': 'holeshot-crm',
        },
      },
    });



