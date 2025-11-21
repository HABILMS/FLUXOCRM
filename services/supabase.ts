
import { createClient } from '@supabase/supabase-js';

// SUBSTITUA PELAS SUAS CHAVES DO SUPABASE
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sua-url.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anon';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
