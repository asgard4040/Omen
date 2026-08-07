import { createClient } from '@supabase/supabase-js';

// Safely extract environment variables to prevent typescript compilation issues
const metaEnv = (import.meta as any).env || (typeof process !== 'undefined' ? process.env : {}) || {};

// Retrieve environment variables safely
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'placeholder';

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Checks if the Supabase environment variables are properly configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    !!metaEnv.VITE_SUPABASE_URL &&
    !!metaEnv.VITE_SUPABASE_ANON_KEY &&
    metaEnv.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
}
