
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
// Certifique-se de que a URL e a KEY estão corretas e são do seu projeto atual
const SUPABASE_URL = 'https://hvwkwefohpqsnwkxbijs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2d2t3ZWZvaHBxc253a3hiaWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDg4MTEsImV4cCI6MjA3OTMyNDgxMX0.UxU4GFgLZrnz1dLTqa9cR1toMlUaO5oPIZ6zxRs3BLI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
