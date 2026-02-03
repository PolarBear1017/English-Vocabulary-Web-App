// src/supabase.js
import { createClient } from '@supabase/supabase-js';

const normalizeEnvValue = (value) => (value || '').trim().replace(/^"+|"+$/g, '');
const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAnonKey = supabaseKey;
