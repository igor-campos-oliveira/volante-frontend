import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as ImportMetaEnv & {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_SCHEMA?: string;
  NEXT_PUBLIC_SUPABASE_SCHEMA?: string;
};

export const supabaseUrl = (env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
export const supabaseKey =
  (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
export const supabaseSchema = env.VITE_SUPABASE_SCHEMA ?? env.NEXT_PUBLIC_SUPABASE_SCHEMA ?? 'public';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      apikey: supabaseKey,
    },
  },
});
