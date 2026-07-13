// ============================================================
// FILL IN YOUR SUPABASE CREDENTIALS HERE
// Get these from: https://supabase.com → your project → Settings → API
// ============================================================

const SUPABASE_URL  = 'https://sehwsulmosmghctahepq.supabase.co';   // e.g. https://xyzxyz.supabase.co
const SUPABASE_ANON = 'sb_publishable_V6TuoH-Wy--iTJqU6XXrHg_6TL44KZO';

// The public URL of your GitHub Pages site (no trailing slash)
// e.g. https://yourusername.github.io/secret-shirt
const SITE_URL = 'https://tesvaraj.github.io/london-tea-party';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
