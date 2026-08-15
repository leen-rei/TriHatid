// supabase.js
if (!window._supabase) {
  const SUPABASE_URL = 'https://ynwsauldwhfmlbnrhfhl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_JHg6iSCw9h9DlRzp463zxg__3tEzREv';

  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Global reference safely assigned without redeclaring keywords
var _supabase = window._supabase;